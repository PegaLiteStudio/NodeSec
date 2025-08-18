import {Request, Response} from 'express';

/**
 * Response message codes organized by category for better understanding and maintenance.
 *
 * Code Ranges:
 * - 000-099: Validation Errors (Input/Parameter validation issues)
 * - 100-199: Account/User Related Errors
 * - 200-299: Access Control & Security Errors
 * - 300-399: Session & Token Expiration Errors
 * - 900-999: Application & System Errors
 * - 1000+:   General & Rate Limiting Errors
 */
const RESPONSE_MESSAGES = {
    // === VALIDATION ERRORS (000-099) ===
    /** Required parameters are missing from the request */
    MISSING_OR_INVALID_PARAMETERS: "000",
    /** Email format is invalid or not provided */
    INVALID_EMAIL: "001",
    /** Phone number format is invalid */
    INVALID_NUMBER: "002",
    /** Password doesn't meet security requirements */
    INVALID_PASSWORD: "003",
    /** OTP code is incorrect or invalid format */
    INVALID_OTP: "004",
    /** Name contains invalid characters or format */
    INVALID_NAME: "005",
    /** Referral code format is invalid or doesn't exist */
    INVALID_REFER_CODE: "006",

    // === ACCOUNT & USER ERRORS (100-199) ===
    /** User account already exists with this email/phone */
    ACCOUNT_EXISTS: "101",
    /** No account found with provided credentials */
    ACCOUNT_NOT_EXISTS: "102",
    /** This user has already claimed a referral bonus */
    REFER_BONUS_ALREADY_CLAIMED: "103",
    /** A similar request is already being processed */
    REQUEST_ALREADY_PENDING: "104",

    // === ACCESS CONTROL & SECURITY ERRORS (200-299) ===
    /** Account has been suspended or banned */
    ACCOUNT_BANNED: "201",
    /** Maximum login/attempt limit reached, account temporarily locked */
    MAX_ATTEMPTS_REACHED: "202",
    /** The Account is already linked to another device */
    ACCOUNT_LINKED_WITH_OTHER_DEVICE: "203",
    /** This device is already registered with another account */
    DEVICE_ALREADY_REGISTERED: "204",
    /** This account is already registered with max the number of devices */
    MAX_DEVICES_ALREADY_REGISTERED: "204",

    // === SESSION & EXPIRATION ERRORS (300-399) ===
    /** OTP has expired, please request a new one */
    OTP_EXPIRED: "301",
    /** User session has expired, please log in again */
    SESSION_EXPIRED: "302",
    /** User subscription has expired */
    SUBSCRIPTION_EXPIRED: "303",

    // === FINANCIAL & TRANSACTION ERRORS (700-799) ===
    /** Insufficient balance in game wallet */
    INSUFFICIENT_TOKENS: "701",

    // === APPLICATION & SYSTEM ERRORS (900-999) ===
    /** Application is under maintenance, try again later */
    APP_UNDER_MAINTENANCE: "901",
    /** App version is outdated, update required */
    UPDATE_REQUIRED: "902",
    /** App version is not supported */
    INVALID_APP_VERSION: "903",

    // === GENERAL & RATE LIMITING ERRORS (1000+) ===
    /** An unexpected error occurred */
    ERROR: "1001",
    /** Too many requests from this IP/user, rate limited */
    TOO_MANY_REQUESTS: "1002"
} as const;


// Extract the response message codes as a union type
type ResponseMessageCode = typeof RESPONSE_MESSAGES[keyof typeof RESPONSE_MESSAGES];

// Define interfaces for consistent response structures
interface BaseResponse {
    status: string;
}

interface ErrorResponse extends BaseResponse {
    status: "error";
    error: string;
}

interface SuccessResponse extends BaseResponse {
    status: "success";
    data?: unknown[];
}

interface FailedResponse extends BaseResponse {
    status: "failed";
    code: string;
    data?: unknown;
}

/**
 * Log an error and respond with a generic error message.
 * @param res - Express response object.
 * @param err - Error message or Error object.
 */
const throwError = (res: Response, err: string | Error): void => {
    const errorMessage = err instanceof Error ? err.message : err;
    console.error(errorMessage);

    const response: ErrorResponse = {
        status: "error",
        error: errorMessage
    };

    res.status(200).json(response);
};

/**
 * Log an internal server error and respond with a 500 status code.
 * @param req - Express request object.
 * @param res - Express response object.
 * @param err - Error message or Error object.
 */
const throwInternalError = (req: Request, res: Response, err: string | Error): void => {
    const errorMessage = err instanceof Error ? err.message : err;
    console.error(`Internal Server Error: ${errorMessage}`, {
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString()
    });

    const response: ErrorResponse = {
        status: "error",
        error: errorMessage
    };

    res.status(500).json(response);
};

/**
 * Respond with a success message.
 * @param res - Express response object.
 */
const respondSuccess = (res: Response): void => {
    const response: SuccessResponse = {
        status: "success"
    };

    res.status(200).json(response);
};

/**
 * Respond with a success message and additional data.
 * @param res - Express response object.
 * @param data - Data to include in the response.
 */
const respondSuccessWithData = (res: Response, data: unknown): void => {
    const response: SuccessResponse = {
        status: "success",
        data: Array.isArray(data) ? data : [data]
    };

    res.status(200).json(response);
};

/**
 * Respond with a failure message and optional data.
 * @param res - Express response object.
 * @param code - Failure code from RESPONSE_MESSAGES.
 * @param data - Optional additional data.
 */
const respondFailed = (res: Response, code: ResponseMessageCode, data?: unknown): void => {
    const response: FailedResponse = {
        status: "failed",
        code,
        ...(data !== undefined && {data})
    };

    res.status(200).json(response);
};

/**
 * Respond with a custom data object.
 * @param res - Express response object.
 * @param data - Custom response data.
 */
const respond = (res: Response, data: Record<string, unknown>): void => {
    res.status(200).json(data);
};

/**
 * Respond with a pre-declared message.
 * @param res - Express response object.
 * @param msg - Pre-declared response message.
 */
const respondDeclared = (res: Response, msg: Record<string, unknown>): void => {
    res.status(200).json(msg);
};

export {
    throwError,
    throwInternalError,
    respondSuccess,
    respondSuccessWithData,
    respondFailed,
    respond,
    respondDeclared,
    RESPONSE_MESSAGES,
    type ResponseMessageCode,
    type ErrorResponse,
    type SuccessResponse,
    type FailedResponse
};
