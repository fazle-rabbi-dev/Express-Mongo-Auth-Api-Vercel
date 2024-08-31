import express from "express";
import {
    registerUser,
    confirmAccount,
    loginUser,
    socialAuth,
    changePassword,
    updateAccount,
    getUser
} from "../controllers/authController.js";
import { seedUsers } from "../controllers/seedController.js";
import { verifyJwt, authLimiter } from "../utils/index.js";


const useAuthRouter = db => {
    const router = express.Router();
    const Users = db.collection("users");
    
    // A new router for a base path
    const authRouter = express.Router();
    
    authRouter.post("/register", authLimiter, registerUser(Users));
    authRouter.get("/confirm-account", confirmAccount(Users));
    authRouter.post("/login", authLimiter, loginUser(Users));
    authRouter.post("/social", socialAuth(Users));
    authRouter.put("/change-password", verifyJwt, changePassword(Users));
    
    // Use base path for all auth routes
    router.use("/api/auth", authRouter);
    
    // users
    router.patch("/api/users/update-account", verifyJwt, updateAccount(Users));
    router.get("/api/users/:userId", verifyJwt, getUser(Users));
    
    // For seeding purpose
    /*router.get("/seed/users", seedUsers(Users));*/
    
    return router;
};

export default useAuthRouter;
