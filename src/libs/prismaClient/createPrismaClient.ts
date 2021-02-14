import { PrismaClient } from "@prisma/client";

const createPrismaClient = (): PrismaClient => {
  const prisma = new PrismaClient();
  return prisma;
};

export default createPrismaClient;
