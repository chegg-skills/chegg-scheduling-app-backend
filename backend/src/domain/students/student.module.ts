import { createStudentRepo } from "./student.repository";
import { createStudentService } from "./student.service";
import { createStudentController } from "./student.controller";

const studentRepo = createStudentRepo();
const studentService = createStudentService(studentRepo);
const studentController = createStudentController(studentService);

export default studentController;
export { studentService, studentRepo };
