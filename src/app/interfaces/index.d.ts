import { Role } from "../../../generated/prisma/enums";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: Role;
        email: string;
      } | undefined;
    }
  }
}
