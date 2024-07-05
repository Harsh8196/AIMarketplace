import SwaggerUI from "swagger-ui-react"
import "swagger-ui-react/swagger-ui.css"
import jsonData from '../Json/ProvingBackend.json'

export default function SwaggerUIAI() {
    return(
    <div>
<SwaggerUI spec={jsonData} />
    </div>
    )
}