import { bookingQuestionService } from "../systemSettings/systemSetting.module";
import { createPublicRepo } from "./public.repository";
import { createPublicService } from "./public.service";
import { createPublicController } from "./public.controller";

const publicRepo = createPublicRepo();
const publicService = createPublicService(publicRepo, {
  getDefaultQuestionTexts: () => bookingQuestionService.getDefaultQuestionTexts(),
});
const publicController = createPublicController(publicService);

export default publicController;
export { publicService, publicRepo };
