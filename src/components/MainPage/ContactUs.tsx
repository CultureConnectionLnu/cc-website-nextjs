import { type ContactBody } from "@/app/api/main/contact/route";

export default function ContactUs() {
    return (
        <div>
            <p className="font-Header text-mainColor md:text-9xl text-6xl sm:text-5xl font-bold mb-8">
                Contact Us
            </p>
            <form action={createContactUs}>
                <label htmlFor="name">Name:</label>
                <input type="text" name="name" />
                <br/>
                <label htmlFor="email">Email:</label>
                <input type="text" name="email" />
                <br />
                <label htmlFor="inquiry">Inquiry:</label>
                <input type="text" name="inquiry" />
                <br/>
                <button type="submit" >Submit</button>
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
