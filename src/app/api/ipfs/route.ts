import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const cid = req.nextUrl.searchParams.get("cid");

  if (!cid) {
    return new NextResponse("Missing CID", { status: 400 });
  }

  try {
    const gatewayUrl = `https://ipfs.io/ipfs/${cid}`;

    // Fetch the file from IPFS gateway
    const ipfsRes = await fetch(gatewayUrl);

    if (!ipfsRes.ok) {
      return new NextResponse("Failed to fetch from gateway", { status: 502 });
    }

    const contentType = ipfsRes.headers.get("Content-Type") || "application/octet-stream";
    const buffer = await ipfsRes.arrayBuffer();

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*", 
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("Proxy fetch error:", e);
    return new NextResponse("Internal proxy error", { status: 500 });
  }
}
