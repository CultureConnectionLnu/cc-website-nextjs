import { type NextRequest, NextResponse } from "next/server";
import { type CreateEmailResponseSuccess, Resend } from "resend";

const resendKey = process.env.RESEND_API_KEY as string;
const resend = new Resend(resendKey);
const notificationEmail = process.env.NOTIFICATION_EMAIL as string;

type ContactBody = {
	name: string;
	email: string;
	subject: string;
	content: string;
};

export async function POST(req: NextRequest) {
	let contactData: ContactBody;
	try {
		contactData = await req.json();
	} catch {
		return NextResponse.json({ message: "Bad request" }, { status: 400 });
	}

	let emailResponse: CreateEmailResponseSuccess;
	try {
		const { data, error } = await resend.emails.send({
			from: notificationEmail,
			to: "cultureconnectionlnu@gmail.com",
			subject: contactData.subject,
			html: `Name: ${contactData?.name}\nEmail: ${contactData?.email}\nMessage: ${contactData?.content}`,
		});

		if (error) {
			console.error(
				`Failed to send email over resend api: [${error.name}] ${error.message}`,
			);
			return NextResponse.json(
				{ message: "Failed to send email." },
				{ status: 500 },
			);
		}
		emailResponse = data;
	} catch (error) {
		console.error(
			`Caught exception while sending email: ${JSON.stringify(error)}`,
		);
		return NextResponse.json(
			{ message: "Failed to send email." },
			{ status: 500 },
		);
	}

	console.log(`Email sent successfully: ${JSON.stringify(emailResponse)}`);
	return NextResponse.json({ message: "Email sent successfully." });
}
