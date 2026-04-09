import { prisma } from "../../lib/prisma";
import status from "http-status";
import AppError from "../../helpers/errorHelpers/AppError";
import { IUpdateProfilePayload } from "./user.interface";
import { UserStatus } from "../../../../generated/prisma/enums";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";

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

/**
 * @desc    Promote user to admin
 * @route   PATCH /api/v1/users/make-admin/:id
 * @access  Admin only
 */

const makeAdmin = async (userId: string) => {
  // check user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  // already admin check
  if (user.role === "ADMIN") {
    throw new AppError(status.BAD_REQUEST, "User is already an admin");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      role: "ADMIN",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      image: true,
    },
  });

  return updatedUser;
};

const blockUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  // already blocked
  if (user.status === "BLOCKED") {
    throw new AppError(status.BAD_REQUEST, "User is already blocked");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      status: "BLOCKED",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      image: true,
    },
  });

  return updatedUser;
};

/**
 * @desc    Unblock a user
 * @route   PATCH /api/v1/users/unblock/:id
 * @access  Admin only
 */
const unblockUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  // already active
  if (user.status === UserStatus.ACTIVE) {
    throw new AppError(status.BAD_REQUEST, "User is already active");
  }

  if (user.status === UserStatus.DELETED) {
    throw new AppError(status.BAD_REQUEST, "Deleted user cannot be unblocked");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      image: true,
    },
  });

  return updatedUser;
};

/**
 * Get a single user by ID
 * @param userId - ID of the user to fetch
 */
const getUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  return user;
};

/**
 * @desc Get all users with advanced query features
 */
const getAllUsers = async (query: IQueryParams) => {
  const queryBuilder = new QueryBuilder(prisma.user, query, {
    searchableFields: ["name", "email"], // search
    filterableFields: ["role", "status"], // filter
  });

  const result = await queryBuilder
    .search() // name, email search
    .filter() // role, status filter
    .sort() // sorting
    .paginate() // pagination
    .execute();

  return result;
};

export const UserService = {
  updateProfile,
  makeAdmin,
  blockUser,
  unblockUser,
  getUserById,
  getAllUsers,
};
