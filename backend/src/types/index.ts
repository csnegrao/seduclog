import { Role, RequestStatus, OrderStatus, DeliveryStatus, MovementType, Priority } from '@prisma/client';

export { Role, RequestStatus, OrderStatus, DeliveryStatus, MovementType, Priority };

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface AuthRequest extends Express.Request {
  user?: JwtPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
