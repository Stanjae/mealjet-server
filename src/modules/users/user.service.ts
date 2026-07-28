import { UserModel } from "./user.model";

class UserService {
  user() {
    return UserModel;
  }
}

const userService = new UserService();
export default userService;
