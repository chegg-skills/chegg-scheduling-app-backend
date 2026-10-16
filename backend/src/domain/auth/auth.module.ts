import {
  revokeAllRefreshTokensForUser,
  revokeRefreshToken,
  rotateRefreshToken,
} from "../../shared/auth/refreshTokenUtils";
import { createAuthRepo } from "./auth.repository";
import { createAuthService } from "./auth.service";
import { createAuthController } from "./auth.controller";

const authRepo = createAuthRepo();
const authService = createAuthService(authRepo, {
  revokeRefreshToken,
  rotateRefreshToken,
  revokeAllRefreshTokensForUser,
});
const authController = createAuthController(authService);

export default authController;
export { authService, authRepo };
