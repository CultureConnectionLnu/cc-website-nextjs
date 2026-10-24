import Header from "@/components/Header";

function H1({ children }: { children: React.ReactNode }) {
    return (
        <h1 className="text-3xl my-4 font-bold text-gray-800 print:text-black">
            {children}
        </h1>
    );
}

function H2({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="text-2xl pt-4 m-2 font-semibold text-purple-800 mb-4 print:text-black">
            {children}
        </h2>
    );
}

function H3({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-xl pt-4 m-2 font-bold text-gray-800 print:text-black">
            {children}
        </h3>
    );
}

function P({ children }: { children: React.ReactNode }) { 
    return (
        <p className="ml-2">
            {children}
        </p>
    )
}

function UL({ children }: { children: React.ReactNode }) {
    return (
        <ul className="list-disc ml-6">
            {children}
        </ul>
    );
}

export const overrideComponents = {
    h1: H1,
    h2: H2,
    h3: H3,
    p: P,
    ul: UL,
};

export default async function Governance({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <div className="print:hidden">
                <Header />
            </div>

            <div className="mx-auto px-4 mt-24 max-w-4xl bg-white shadow-lg rounded-lg p-8 print:shadow-none print:p-0">
                <div className="justify-between items-center mb-8 border-b pb-4 print:border-b-2 print:border-black">
                    {children}
                </div>
            </div>
        </div>
    );
}
