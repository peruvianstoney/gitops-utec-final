const AWS = require('aws-sdk');

const handler = async (event, context) => {
    const lambdaClient = new AWS.Lambda();
    console.log('Event received:', JSON.stringify(event));

    try {
        // Extraer nroRuc de los parámetros de la ruta
        const nroRuc = event.pathParameters && event.pathParameters.nroRuc;
        
        console.log('nroRuc extracted:', nroRuc);

        // Verificar que nroRuc existe
        if (!nroRuc) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Error en la solicitud',
                    error: 'nroRuc es requerido en la URL'
                })
            };
        }

        // Parámetros para invocar la Lambda existente
        const params = {
            FunctionName: 'arn:aws:lambda:us-east-1:654654589924:function:empresas_bd',
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify({
                operation: 'GET',
                payload: { NRO_RUC: nroRuc }
            })
        };
        console.log('Invoke parameters:', params);

        // Invocar la Lambda existente
        const result = await lambdaClient.invoke(params).promise();
        console.log('Lambda invocation result:', result);

        // Parsear la respuesta de la Lambda invocada
        const responseBody = JSON.parse(result.Payload);
        const items = JSON.parse(responseBody.body);
        console.log('Items received:', items);

        // Preparar la respuesta
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Consulta exitosa',
                data: items
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Error en la consulta',
                error: error.message
            })
        };
    }
};

module.exports = { handler };
