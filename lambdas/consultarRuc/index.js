const AWS = require('aws-sdk');

//const handler = async (event, lambdaClient = new AWS.Lambda()) => {
 //   console.log('Event received:', JSON.stringify(event));
 const handler = async (event, context) => {
    const lambdaClient = new AWS.Lambda();
    console.log('Event received:', JSON.stringify(event));
    try {
    // Extraer el cuerpo de la solicitud del evento de API Gateway
    let body;

        console.log('Parsed body:', body);


        // Parámetros para invocar la Lambda existente
        const params = {
            FunctionName: 'arn:aws:lambda:us-east-1:654654589924:function:empresas_bd',
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify({
                operation: 'GET'
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