import { NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  AnchorUtils,
  Randomness,
  getDefaultQueueAddress,
  isMainnetConnection,
} from "@switchboard-xyz/on-demand";
import { getRpcEndpoint } from "@/solana/config";

type RandomnessRequest = {
  payer: string;
  randomness: string;
  randomnessSecret: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RandomnessRequest;
    if (!body?.payer || !body?.randomness || !body?.randomnessSecret) {
      return NextResponse.json(
        { error: "Missing payer or randomness account" },
        { status: 400 },
      );
    }

    let payer: PublicKey;
    let randomness: PublicKey;
    let randomnessKeypair: Keypair;
    try {
      payer = new PublicKey(body.payer);
      randomness = new PublicKey(body.randomness);
      randomnessKeypair = Keypair.fromSecretKey(
        Buffer.from(body.randomnessSecret, "base64"),
      );
    } catch {
      return NextResponse.json(
        { error: "Invalid public key" },
        { status: 400 },
      );
    }

    if (!randomnessKeypair.publicKey.equals(randomness)) {
      return NextResponse.json(
        { error: "Randomness keypair mismatch" },
        { status: 400 },
      );
    }

    const connection = new Connection(getRpcEndpoint(), "confirmed");
    const program = await AnchorUtils.loadProgramFromConnection(connection);
    const isMainnet = await isMainnetConnection(connection);
    const queue = getDefaultQueueAddress(isMainnet);
    const [randomnessAccount, createIx] = await Randomness.create(
      program,
      randomnessKeypair,
      queue,
      payer,
    );

    return NextResponse.json({
      randomnessAccount: randomnessAccount.pubkey.toBase58(),
      instruction: {
        programId: createIx.programId.toBase58(),
        data: Buffer.from(createIx.data).toString("base64"),
        keys: createIx.keys.map((key) => ({
          pubkey: key.pubkey.toBase58(),
          isSigner: key.isSigner,
          isWritable: key.isWritable,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Randomness setup failed",
      },
      { status: 500 },
    );
  }
}
