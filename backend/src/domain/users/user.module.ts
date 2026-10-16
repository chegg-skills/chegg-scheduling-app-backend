import { createUserRepo } from "./user.repository";
import { createUserService } from "./user.service";
import { createUserController } from "./user.controller";

const userRepo = createUserRepo();
const userService = createUserService(userRepo);
const userController = createUserController(userService);

export default userController;
export { userService, userRepo };
