import { NextRequest } from "next/server";
import * as Client from "@web3-storage/w3up-client";
import { StoreMemory } from "@web3-storage/w3up-client/stores/memory";
import { Signer } from "@web3-storage/w3up-client/principal/ed25519";
import * as Proof from "@web3-storage/w3up-client/proof";
import { parse as parseDid } from "@ipld/dag-ucan/did";

// --- Module-scoped initialization ---
// Backend's private key and space proof are loaded once on cold start
const rawKey = process.env.WEB3_AGENT_KEY!;
const rawProof = process.env.WEB3_AGENT_PROOF!;

if (!rawKey || !rawProof) {
  throw new Error("Missing private key or proof.");
}

const principal = Signer.parse(rawKey);
const proofPromise = Proof.parse(rawProof); // lazy loaded
const store = new StoreMemory();

// Initialize a backend W3UP client with authority, once
const clientPromise = Client.create({ principal, store });

/**
 * Handles GET requests to issue a temporary delegation to a frontend agent DID.
 * 
 * This endpoint is called by the frontend with its ephemeral agent DID,
 * and returns a signed CAR file containing the delegation with upload capabilities.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { did: string } }
) {
  const did = decodeURIComponent(params.did);

  // Validate the requested DID format
  if (!did.startsWith("did:key:")) {
    return new Response(JSON.stringify({ error: "Invalid DID" }), {
      status: 400,
    });
  }

  try {
    const client = await clientPromise;
    const proof = await proofPromise;

    // Add space from proof and set it as the current context
    const space = await client.addSpace(proof);
    await client.setCurrentSpace(space.did());

    // Parse the frontend ephemeral agent DID (audience)
    const audience = parseDid(did);

    // Set delegation expiration (24 hours from now)
    const expiration = Math.floor(Date.now() / 1000) + 60 * 60 * 24;

    // Capabilities to allow uploading to space
    const capabilities = [
      "upload/add",        // Permission to upload files
      "space/blob/add",    // Permission to store file blobs
      "space/index/add",   // Permission to register files in index
      "space/info"         // Read space metadata
    ];

    // Create the actual delegation
    const delegation = await client.createDelegation(audience, capabilities, {
      expiration,
    });

    // Export the delegation as a CAR (Content Addressed Archive) file
    const archive = await delegation.archive();
    if (!archive.ok) {
      return new Response(
        JSON.stringify({ error: "Delegation archive failed" }),
        { status: 500 }
      );
    }

    // Return CAR binary to frontend for loading the delegation
    return new Response(Buffer.from(archive.ok), {
      status: 200,
      headers: {
        "Content-Type": "application/car",
        "Content-Disposition": 'attachment; filename="delegation.car"',
      },
    });
  } catch (err: any) {
    console.error("Delegation handler error:", err);
    return new Response(
      JSON.stringify({
        error:
          typeof err === "string"
            ? err
            : err.message || JSON.stringify(err) || "Unknown error",
      }),
      { status: 500 }
    );
  }
}
