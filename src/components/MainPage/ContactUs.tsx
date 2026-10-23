import { type ContactBody } from "@/app/api/main/contact/route";

export default function ContactUs() {
	return (
		<div className="container mx-auto px-4">
			<h2 className="text-7xl font-bold text-center mb-5 text-mainColor font-Header">
				Contact Us
			</h2>
			<form action={createContactUs} className="">
				<div className="flex flex-row">
					<div className="w-1/2 p-2">
						<label
							htmlFor="name"
							className="block text-sm font-medium text-gray-700"
						>
							Name:
						</label>
						<input
							type="text"
							name="name"
							id="name"
							required
							className="w-full mt-1 block border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>
					<div className="w-1/2 p-2">
						<label
							htmlFor="email"
							className="block text-sm font-medium text-gray-700"
						>
							Email:
						</label>
						<input
							type="email"
							name="email"
							id="email"
							required
							className="w-full mt-1 block border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>
				</div>
				<div className="p-2">
					<label
						htmlFor="inquiry"
						className="block mb-1 text-sm font-medium text-gray-700"
					>
						Inquiry:
					</label>
					<textarea
						id="inquiry"
						placeholder="How can we help?"
						rows={4}
						className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
					></textarea>
				</div>
				<div className="flex items-center justify-center">
					<button
						type="submit"
						className="bg-mainColor m-4 px-6 py-2 text-xl text-white rounded-md"
					>
						Submit
					</button>
				</div>
			</form>
		</div>
	);
}

async function createContactUs(formdata: FormData) {
	const formData: ContactBody = {
		name: formdata.get("name") as string,
		email: formdata.get("email") as string,
		content: formdata.get("content") as string,
	};
}
