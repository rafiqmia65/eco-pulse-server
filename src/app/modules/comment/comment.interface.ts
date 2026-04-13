import { Role } from "../../../../generated/prisma/enums";

export interface ICreateCommentPayload {
  userId: string;
  userRole: Role;
  ideaId: string;
  content: string;
  parentId?: string;
}
