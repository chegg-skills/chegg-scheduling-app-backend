import { Prisma, UserRole } from "@prisma/client";
import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { prisma } from "../../shared/db/prisma";
import { SALT_ROUNDS, type SafeUser, normalizeEmail, validateTimezone, toSafeUser } from "../../shared/utils/userUtils";
import { buildAuthToken } from "../../shared/utils/jwtUtils";

const MAX_FAILED_LOGIN_ATTEMPTS = Number(
	process.env.MAX_FAILED_LOGIN_ATTEMPTS ?? 5
);
const LOGIN_LOCKOUT_MINUTES = Number(process.env.LOGIN_LOCKOUT_MINUTES ?? 15);

const getLockoutUntil = (): Date => {
	return new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60 * 1000);
};

type RegisterUserInput = {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
	phoneNumber?: string;
	avatarUrl?: string;
	role?: string;
	timezone?: string;
};

type LoginUserInput = {
	email: string;
	password: string;
};

const isValidRole = (role: string): role is UserRole => {
	return Object.values(UserRole).includes(role as UserRole);
};

const register = async (
	payload: RegisterUserInput
): Promise<{ user: SafeUser; token: string }> => {
	const firstName = payload.firstName?.trim();
	const lastName = payload.lastName?.trim();
	const email = payload.email?.trim();
	const password = payload.password?.trim();

	if (!firstName || !lastName || !email || !password) {
		throw new ErrorHandler(
			StatusCodes.BAD_REQUEST,
			"firstName, lastName, email and password are required."
		);
	}

	if (password.length < 8) {
		throw new ErrorHandler(
			StatusCodes.BAD_REQUEST,
			"Password must be at least 8 characters long."
		);
	}

	const normalizedEmail = normalizeEmail(email);

	const role = payload.role ? payload.role.trim() : UserRole.COACH;
	if (!isValidRole(role)) {
		throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Invalid user role.");
	}

	const timezone = payload.timezone
		? validateTimezone(payload.timezone.trim())
		: "UTC";

	const existingUser = await prisma.user.findUnique({
		where: { email: normalizedEmail },
	});

	if (existingUser) {
		throw new ErrorHandler(
			StatusCodes.CONFLICT,
			"A user with this email already exists."
		);
	}

	const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

	try {
		const createdUser = await prisma.user.create({
			data: {
				firstName,
				lastName,
				email: normalizedEmail,
				password: hashedPassword,
				phoneNumber: payload.phoneNumber?.trim(),
				avatarUrl: payload.avatarUrl?.trim(),
				role,
				timezone,
			},
		});

		const safeUser = toSafeUser(createdUser);

		return {
			user: safeUser,
			token: buildAuthToken(safeUser),
		};
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			throw new ErrorHandler(
				StatusCodes.CONFLICT,
				"A user with this email already exists."
			);
		}

		throw error;
	}
};

const login = async (
	payload: LoginUserInput
): Promise<{ user: SafeUser; token: string }> => {
	const email = payload.email?.trim();
	const password = payload.password?.trim();

	if (!email || !password) {
		throw new ErrorHandler(
			StatusCodes.BAD_REQUEST,
			"email and password are required."
		);
	}

	const normalizedEmail = normalizeEmail(email);

	const user = await prisma.user.findUnique({
		where: { email: normalizedEmail },
	});

	if (!user) {
		throw new ErrorHandler(
			StatusCodes.UNAUTHORIZED,
			"Invalid email or password."
		);
	}

	if (!user.isActive) {
		throw new ErrorHandler(
			StatusCodes.FORBIDDEN,
			"This account is inactive. Please contact an administrator."
		);
	}

	if (user.lockedUntil && user.lockedUntil > new Date()) {
		throw new ErrorHandler(
			StatusCodes.LOCKED,
			"Too many failed attempts. Account is temporarily locked."
		);
	}

	const isPasswordValid = await bcrypt.compare(password, user.password);

	if (!isPasswordValid) {
		const nextFailedAttempts = user.failedLoginAttempts + 1;
		const shouldLockAccount =
			nextFailedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;

		await prisma.user.update({
			where: { id: user.id },
			data: {
				failedLoginAttempts: shouldLockAccount ? 0 : nextFailedAttempts,
				lockedUntil: shouldLockAccount ? getLockoutUntil() : null,
			},
		});

		if (shouldLockAccount) {
			throw new ErrorHandler(
				StatusCodes.LOCKED,
				"Too many failed attempts. Account is temporarily locked."
			);
		}

		throw new ErrorHandler(
			StatusCodes.UNAUTHORIZED,
			"Invalid email or password."
		);
	}

	const updatedUser = await prisma.user.update({
		where: { id: user.id },
		data: {
			lastLoginAt: new Date(),
			failedLoginAttempts: 0,
			lockedUntil: null,
		},
	});

	const safeUser = toSafeUser(updatedUser);

	return {
		user: safeUser,
		token: buildAuthToken(safeUser),
	};
};

const logout = async (): Promise<{ message: string }> => {
	return { message: "Logged out successfully." };
};

type BootstrapInput = {
	bootstrapSecret: string;
	firstName: string;
	lastName: string;
	email: string;
	password: string;
	timezone?: string;
};

/**
 * One-time endpoint to create the very first SUPER_ADMIN on a fresh installation.
 * Permanently disabled once any user exists.
 * Requires BOOTSTRAP_SECRET env var to prevent unauthorized use.
 */
const bootstrap = async (
	payload: BootstrapInput
): Promise<{ user: SafeUser; token: string }> => {
	const secret = process.env.BOOTSTRAP_SECRET;
	if (!secret) {
		console.warn(
			"[BOOTSTRAP] BOOTSTRAP_SECRET is not set. Configure it in .env to enable first-admin provisioning."
		);
		throw new ErrorHandler(
			StatusCodes.FORBIDDEN,
			"Bootstrap is not enabled on this server."
		);
	}

	if (payload.bootstrapSecret !== secret) {
		throw new ErrorHandler(StatusCodes.FORBIDDEN, "Invalid bootstrap secret.");
	}

	const userCount = await prisma.user.count();
	if (userCount > 0) {
		throw new ErrorHandler(
			StatusCodes.FORBIDDEN,
			"Bootstrap is only available on a fresh installation. Use the invite flow to add more admins."
		);
	}

	// Force SUPER_ADMIN — ignore any role in the payload
	return register({
		firstName: payload.firstName,
		lastName: payload.lastName,
		email: payload.email,
		password: payload.password,
		timezone: payload.timezone,
		role: UserRole.SUPER_ADMIN,
	});
};
export { bootstrap, login, logout, register };
