import z from "zod";

export const VerificationRequest = z.object({
	userID: z.string().trim().min(1),
	requestedAt: z.iso.datetime(),
});

export type VerificationRequest = z.infer<typeof VerificationRequest>;

export const VerificationRequests = z.array(VerificationRequest);
export type VerificationRequests = z.infer<typeof VerificationRequests>;