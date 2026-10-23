"use client";

import { type ContactBody } from "@/types/main/contact";
import type React from "react";
import { useState } from "react";
import toast from "react-hot-toast";

async function sendContactEmail(fd: FormData) {
	const formData: ContactBody = {
		name: fd.get("name") as string,
		email: fd.get("email") as string,
		content: fd.get("inquiry") as string,
	};

	const res = await fetch("/api/main/contact", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(formData),
	});

	const { data } = await res.json().catch(() => {});
	if (!res.ok) throw new Error(data?.message ?? "Failed to send message.");
}

export default function ContactUs() {
	const [pending, setPending] = useState(false);

	async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = e.currentTarget;
		const fd = new FormData(form);

		setPending(true);
		try {
			await sendContactEmail(fd);
			toast.success("Message sent!");
			form.reset();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to send message.",
			);
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="container mx-auto px-4">
			<h2 className="text-7xl font-bold text-center mb-5 text-mainColor font-Header">
				Contact Us
			</h2>
			<form onSubmit={handleSubmit} className="">
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
						name="inquiry"
						placeholder="How can we help?"
						rows={4}
						className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
					></textarea>
				</div>
				<div className="flex items-center justify-center">
					<button
						type="submit"
						disabled={pending}
						className="bg-mainColor m-4 px-6 py-2 text-xl text-white rounded-md disabled:cursor-not-allowed"
					>
						Submit
					</button>
				</div>
			</form>
		</div>
	);
}
