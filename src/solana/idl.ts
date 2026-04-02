import type { Idl } from "@coral-xyz/anchor";
import rawIdl from "./idl/token_lottery.json";

const idl = ((rawIdl as unknown as { default?: Idl }).default ?? rawIdl) as Idl;

export const IDL_ADDRESS = idl.address;

const instructionDiscriminators = new Map(
  (idl.instructions ?? []).map((instruction) => [
    instruction.name,
    Buffer.from(instruction.discriminator),
  ]),
);

const accountDiscriminators = new Map(
  (idl.accounts ?? []).map((account) => [
    account.name,
    Buffer.from(account.discriminator),
  ]),
);

export const getInstructionDiscriminator = (name: string) => {
  const discriminator = instructionDiscriminators.get(name);
  if (!discriminator) {
    throw new Error(`Missing discriminator for instruction: ${name}`);
  }
  return discriminator;
};

export const getAccountDiscriminator = (name: string) => {
  const discriminator = accountDiscriminators.get(name);
  if (!discriminator) {
    throw new Error(`Missing discriminator for account: ${name}`);
  }
  return discriminator;
};
