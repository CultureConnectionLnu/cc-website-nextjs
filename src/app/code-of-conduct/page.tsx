import Governance, { overrideComponents } from "@/components/Governance/Governance";
import CodeOfConduct from "@/markdown/code-of-conduct.mdx"

export default function CodeOfConductPage() {
    return (
        <Governance>
            <CodeOfConduct components={overrideComponents}/>
        </Governance>
    )
}