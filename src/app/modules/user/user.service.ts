import { prisma } from "../../lib/prisma";
import status from "http-status";
import AppError from "../../helpers/errorHelpers/AppError";
import { IUpdateProfilePayload } from "./user.interface";

const updateProfile = async (
  userId: string,
  payload: IUpdateProfilePayload,
) => {
  const { name, email, image } = payload;

  // Find the user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(status.NOT_FOUND, "User not found");

  // If email is being updated, ensure it's unique
  if (email && email !== user.email) {
    const emailExists = await prisma.user.findUnique({ where: { email } });
    if (emailExists)
      throw new AppError(status.CONFLICT, "Email already in use");
  }

  // Update the user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name: name ?? user.name,
      email: email ?? user.email,
      image: image ?? user.image,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

export const UserService = {
  updateProfile,
};
