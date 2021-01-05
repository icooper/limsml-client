/**
 * Module definition file for easy-soap-request, since it doesn't come with one.
 */
declare module "easy-soap-request" {

    /**
     * Object containing HTTP headers to be sent with the SOAP request to the server
     */
    type SoapHeaders = {
        /**
         * HTTP header as key: value
         */
        [header: string]: string,

        /**
         * The SOAP action (http://url/wsdl#action)
         */
        SOAPAction: string
    };

    /**
     * Object containing the SOAP request to be sent to the server
     */
    type SoapRequest = {

        /**
         * URL of the SOAP server
         */
        url: string,

        /**
         * SoapHeaders object containing HTTP headers
         */
        headers: SoapHeaders,

        /**
         * XML body of the SOAP request
         */
        xml: string
    };

    /**
     * Object containing the SOAP response received from the server
     */
    type SoapResponse = {
        
        /**
         * SOAP response
         */
        response: {

            /**
             * HTTP response headers
             */
            headers: {
                
                /**
                 * HTTP response header
                 */
                [header: string]: string
            },

            /**
             * SOAP response body
             */
            body: string,

            /**
             * HTTP status code
             */
            statusCode: number
        }
    };

    /**
     * Sends a SOAP request to the server and returns a promised response
     * @param SoapRequest the request to be sent
     * @returns a promised response
     */
    export default async function soapRequest(request: SoapRequest): Promise<SoapResponse>;

}

