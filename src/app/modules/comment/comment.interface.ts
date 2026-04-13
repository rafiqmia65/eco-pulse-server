import { Role } from "../../../../generated/prisma/enums";

export interface ICreateCommentPayload {
  userId: string;
  userRole: Role;
  ideaId: string;
  content: string;
  parentId?: string;
}

export interface IUpdateCommentPayload {
  userId: string;
  userRole: Role;
  commentId: string;
  content: string;
}
