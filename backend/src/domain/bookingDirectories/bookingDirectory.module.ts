import { createBookingDirectoryRepo } from "./bookingDirectory.repository";
import { createBookingDirectoryService } from "./bookingDirectory.service";
import { createBookingDirectoryController } from "./bookingDirectory.controller";

const bookingDirectoryRepo = createBookingDirectoryRepo();
const bookingDirectoryService = createBookingDirectoryService(bookingDirectoryRepo);
const bookingDirectoryController = createBookingDirectoryController(bookingDirectoryService);

export default bookingDirectoryController;
export { bookingDirectoryService, bookingDirectoryRepo };
