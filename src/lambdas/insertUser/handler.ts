import { createPrismaClient } from "@libs/prismaClient";
import { v4 as uuidv4 } from "uuid";

const handler = async (): Promise<void> => {
  const prisma = createPrismaClient();

  console.log("Cron start: insertUser");

  try {
    await prisma.user.create({
      data: { uuid: uuidv4() },
    });
  } catch (e) {
    console.error(e);
  }

  console.log("Cron end: insertUser");
};

export default handler;
