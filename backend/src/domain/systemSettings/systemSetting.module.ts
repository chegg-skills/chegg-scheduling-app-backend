import { createSystemSettingRepo } from "./systemSetting.repository";
import { createSystemSettingService } from "./systemSetting.service";
import { createSystemSettingController } from "./systemSetting.controller";
import { createBookingQuestionRepo } from "./bookingQuestion.repository";
import { createBookingQuestionService } from "./bookingQuestion.service";
import { createBookingQuestionController } from "./bookingQuestion.controller";

const systemSettingRepo = createSystemSettingRepo();
const systemSettingService = createSystemSettingService(systemSettingRepo);
const systemSettingController = createSystemSettingController(systemSettingService);

const bookingQuestionRepo = createBookingQuestionRepo();
const bookingQuestionService = createBookingQuestionService(bookingQuestionRepo);
const bookingQuestionController = createBookingQuestionController(bookingQuestionService);

export default systemSettingController;
export {
  systemSettingService,
  systemSettingRepo,
  bookingQuestionController,
  bookingQuestionService,
  bookingQuestionRepo,
};
