import crypto from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import rateLimit from 'express-rate-limit';
const ENVIRONMENT = process.env.ENVIRONMENT;


// =====================================================================================================================
// Utilities
// =====================================================================================================================
export const ApiResponse = (res, { statusCode, message, data }) => {
    res.status(statusCode).json({
        success: true,
        statusCode,
        message,
        data
    });
};

export const ApiError = ({ statusCode, message }) => {
    return {
        statusCode,
        message
    };
};

export const generateUniqueString = () => {
    const timestamp = Date.now().toString(36); // Convert timestamp to base 36
    const randomPart = Math.random().toString(36).substr(2, 2); // Get a random part
    return (timestamp + randomPart).substr(-7); // Combine and ensure it's 7 characters long
};

export const generateToken = () => {
    return crypto.randomBytes(32).toString("hex"); // Generates a 64-character hexadecimal token
};

export const generateConfirmationUrl = (username, confirmationToken) => {
  const LOCAL_CLIENT_ADDRESS = process.env.LOCAL_CLIENT_ADDRESS;
  const REMOTE_CLIENT_ADDRESS = process.env.REMOTE_CLIENT_ADDRESS;
  
  let url;
  const common = `/confirm-account?username=${username}&token=${confirmationToken}`;
  
  if(ENVIRONMENT === "dev") {
    url = LOCAL_CLIENT_ADDRESS;
  } else {
    url = REMOTE_CLIENT_ADDRESS;
  }
  
  return url+common;
};

export const sendEmail = async ({ to, subject, html }) => {
    try {
        // Create a transporter object using SMTP
        const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // Email options
        const mailOptions = {
            from: process.env.EMAIL_USER, // Sender address
            to,
            subject,
            html
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: " + info.response);
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        return null;
    }
};

// Rate Limit Handler
const rateLimitErrorHandler = (req, res, next, options) => {
    res.status(options.statusCode).json({
        success: false,
        message: options.message,
        rateLimit: {
            window: options.windowMs / 1000, // window in seconds
            maxRequests: options.max,
            retryAfter: Math.ceil(options.windowMs / 1000) // retry after in seconds
        }
    });
};

export const authLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    message: 'Too many attempts from this IP, please try again after 1 minute.',
    handler: rateLimitErrorHandler
});

// =====================================================================================================================
//  Input Validation
// =====================================================================================================================
export const isValidEmail = email => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email?.trim());
};

export const isValidPassword = password => {
    // For simplicity, let's say a valid password is at least 6 characters long
    return password?.trim()?.length >= 6;
};

export const isValidUsername = username => {
    if (!username?.trim()) return false;

    const usernameRegex = /^[a-z][a-z0-9-]*$/;
    const lowercasedUsername = username.toLowerCase();

    return usernameRegex.test(lowercasedUsername);
};

// Function to validate registration input fields
export const validateRegistration = ({ email, password, username, fullName }) => {
    if (!email?.trim() || !password?.trim() || !username?.trim() || !fullName?.trim()) {
        return { isValid: false, message: "Missing required fields that are required to register an user" };
    }

    if (!isValidEmail(email)) {
        return { isValid: false, message: "Invalid email format" };
    }

    if (!isValidPassword(password)) {
        return {
            isValid: false,
            message: "Password must be at least 6 characters long"
        };
    }

    if (!isValidUsername(username)) {
        return {
            isValid: false,
            message: "Password must be at least 6 characters long"
        };
    }

    if (fullName.length < 4) {
        return {
            isValid: false,
            message: "Full name must be at least 4 characters long"
        };
    }

    return { isValid: true };
};

// Function to validate login input fields
export const validateLogin = ({ email, password }) => {
    if (!email?.trim() || !password?.trim()) {
        return { isValid: false, message: "Email & password are required" };
    }

    if (!isValidEmail(email)) {
        return { isValid: false, message: "Invalid email format" };
    }

    if (!isValidPassword(password)) {
        return {
            isValid: false,
            message: "Password must be at least 6 characters long"
        };
    }

    return { isValid: true };
};

// =====================================================================================================================
// Middleware
// =====================================================================================================================
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

export const verifyJwt = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(
            ApiError({
                statusCode: 401,
                message: "Authorization token is required"
            })
        );
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        next(
            ApiError({
                statusCode: 401,
                message: "Invalid or expired token"
            })
        );
    }
};

export const handleAnonymousUser = (req, res, next) => {
    if(req.headers.anonymous) {
      req.userId = "anonymous";
      return next();
    } else {
      throw ApiError({
        statusCode: 400,
        message: "Invalid request."
      });
    }
};