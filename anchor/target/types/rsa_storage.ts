/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/rsa_storage.json`.
 */
export type RsaStorage = {
  "address": "2yErQiMAVSgabTtYt9FJQY6sUyBX7P1R1N7i1m2ytRY3",
  "metadata": {
    "name": "rsaStorage",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "deleteFileMetadata",
      "discriminator": [
        64,
        81,
        242,
        142,
        56,
        130,
        204,
        37
      ],
      "accounts": [
        {
          "name": "fileMetadata",
          "writable": true
        },
        {
          "name": "uploader",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "cid",
          "type": "string"
        }
      ]
    },
    {
      "name": "getRsaKey",
      "discriminator": [
        221,
        230,
        182,
        1,
        86,
        8,
        103,
        73
      ],
      "accounts": [
        {
          "name": "userRsa",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  114,
                  115,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "signer": true
        }
      ],
      "args": [],
      "returns": "string"
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [],
      "args": []
    },
    {
      "name": "shareFileAccess",
      "discriminator": [
        233,
        253,
        172,
        86,
        100,
        51,
        138,
        119
      ],
      "accounts": [
        {
          "name": "sharer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sharedWith"
        },
        {
          "name": "sharedAccess",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "cid",
          "type": "string"
        },
        {
          "name": "sharedKeyCid",
          "type": "string"
        }
      ]
    },
    {
      "name": "storeFileMetadata",
      "discriminator": [
        42,
        89,
        82,
        220,
        176,
        68,
        230,
        192
      ],
      "accounts": [
        {
          "name": "fileMetadata",
          "writable": true
        },
        {
          "name": "uploader",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "cid",
          "type": "string"
        },
        {
          "name": "keyCid",
          "type": "string"
        },
        {
          "name": "isPublic",
          "type": "bool"
        }
      ]
    },
    {
      "name": "storeRsaKey",
      "discriminator": [
        15,
        51,
        221,
        127,
        192,
        173,
        50,
        58
      ],
      "accounts": [
        {
          "name": "userRsa",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  114,
                  115,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "rsaKey",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "fileMetadata",
      "discriminator": [
        218,
        65,
        2,
        189,
        72,
        195,
        93,
        55
      ]
    },
    {
      "name": "sharedAccess",
      "discriminator": [
        133,
        221,
        251,
        154,
        37,
        64,
        34,
        178
      ]
    },
    {
      "name": "userRsaKey",
      "discriminator": [
        179,
        10,
        210,
        163,
        86,
        145,
        200,
        59
      ]
    }
  ],
  "types": [
    {
      "name": "fileMetadata",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "cid",
            "type": "string"
          },
          {
            "name": "keyCid",
            "type": "string"
          },
          {
            "name": "uploader",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "isPublic",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "sharedAccess",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "cid",
            "type": "string"
          },
          {
            "name": "sharedKeyCid",
            "type": "string"
          },
          {
            "name": "sharedBy",
            "type": "pubkey"
          },
          {
            "name": "sharedWith",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "userRsaKey",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rsaKey",
            "type": "string"
          }
        ]
      }
    }
  ]
};
