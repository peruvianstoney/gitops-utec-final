const AWS = require('aws-sdk');
const ssm = new AWS.SSM();

// Función para obtener parámetros del SSM
async function getParameter(name) {
  console.log(`Solicitando parámetro: ${name}`);
  const params = {
    Name: name,
    WithDecryption: false
  };
  const result = await ssm.getParameter(params).promise();
  console.log(`Parámetro obtenido: ${name} = ${result.Parameter.Value}`);
  return result.Parameter.Value;
}

// Servicio de DynamoDB
class DynamoDBService {
  constructor() {
    this.dynamo = new AWS.DynamoDB.DocumentClient();
    this.TABLE_NAME = null;
    this.INDEX_NAME = null;
  }

  async initialize() {
    this.TABLE_NAME = await getParameter('/dev/rucsystem/database/table-name');
    this.INDEX_NAME = await getParameter('/dev/rucsystem/database/index-name');
  }

  async queryByNroRuc(nroRuc) {
    if (!this.TABLE_NAME || !this.INDEX_NAME) {
      throw new Error('DynamoDBService no ha sido inicializado');
    }
    const params = {
      TableName: this.TABLE_NAME,
      IndexName: this.INDEX_NAME,
      KeyConditionExpression: 'NRO_RUC = :nro_ruc',
      ExpressionAttributeValues: {
        ':nro_ruc': nroRuc
      }
    };
    return this.dynamo.query(params).promise();
  }

  async scanAll() {
    if (!this.TABLE_NAME) {
      throw new Error('DynamoDBService no ha sido inicializado');
    }
    return this.dynamo.scan({ TableName: this.TABLE_NAME }).promise();
  }
}

  
// Clase para manejar las operaciones
class OperationHandler {
  constructor(dynamoService) {
    this.dynamoService = dynamoService;
  }

  async handleGet(payload) {
    await this.dynamoService.initialize(); // Asegúrate de que DynamoDBService esté inicializado
    if (payload && payload.NRO_RUC) {
      const result = await this.dynamoService.queryByNroRuc(payload.NRO_RUC);
      return this.createResponse(200, result.Items);
    } else {
      const result = await this.dynamoService.scanAll();
      return this.createResponse(200, result.Items);
    }
  }

  createResponse(statusCode, body) {
    return {
      statusCode,
      body: JSON.stringify(body)
    };
  }
}

// Función para parsear el evento
const parseEvent = (event) => {
  if (event.requestContext) {
    const body = JSON.parse(event.body || '{}');
    return {
      operation: event.requestContext.http.method,
      payload: body.payload
    };
  } else {
    return {
      operation: event.operation,
      payload: event.payload
    };
  }
};

// Handler principal
const handler = async (event) => {
  const logger = console;
  logger.info(`Received event: ${JSON.stringify(event)}`);

  try {
    const { operation, payload } = parseEvent(event);
    logger.info(`Parsed operation: ${operation}, payload: ${JSON.stringify(payload)}`);

    const dynamoService = new DynamoDBService();
    const operationHandler = new OperationHandler(dynamoService);

    switch (operation) {
      case 'GET':
        return await operationHandler.handleGet(payload);
      default:
        return operationHandler.createResponse(400, { error: `Operación no soportada: "${operation}"` });
    }
  } catch (err) {
    logger.error(`Error occurred: ${err.message}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};


// Exportamos las clases y funciones para poder probarlas
module.exports = {
  handler,
  DynamoDBService,
  OperationHandler,
  parseEvent
};
