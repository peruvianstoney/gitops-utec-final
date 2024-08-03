const AWS = require('aws-sdk');
const { handler, DynamoDBService, OperationHandler, parseEvent } = require('../index');

// Mock de AWS SDK
jest.mock('aws-sdk', () => {
  const mDocumentClient = {
    query: jest.fn().mockReturnThis(),
    scan: jest.fn().mockReturnThis(),
    promise: jest.fn()
  };
  const mSSM = {
    getParameter: jest.fn().mockReturnThis(),
    promise: jest.fn()
  };
  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => mDocumentClient)
    },
    SSM: jest.fn(() => mSSM)
  };
});

describe('Lambda Handler', () => {
  let mockDynamoDb;
  let mockSSM;

  beforeEach(() => {
    mockDynamoDb = new AWS.DynamoDB.DocumentClient();
    mockSSM = new AWS.SSM();
    jest.clearAllMocks();

    // Mock SSM parameter responses
    mockSSM.promise
      .mockResolvedValueOnce({ Parameter: { Value: 'GRUPO5.FACT_EMPRESAS' } })
      .mockResolvedValueOnce({ Parameter: { Value: 'NRO_RUC-index' } });
  });

  test('GET request with NRO_RUC should query DynamoDB', async () => {
    const event = {
      requestContext: { http: { method: 'GET' } },
      body: JSON.stringify({ payload: { NRO_RUC: '12345678901' } })
    };

    mockDynamoDb.promise.mockResolvedValueOnce({ Items: [{ id: 1, name: 'Test Company' }] });

    const result = await handler(event);

    expect(mockSSM.getParameter).toHaveBeenCalledTimes(2);
    expect(mockDynamoDb.query).toHaveBeenCalledWith(expect.objectContaining({
      TableName: 'GRUPO5.FACT_EMPRESAS',
      IndexName: 'NRO_RUC-index',
      KeyConditionExpression: 'NRO_RUC = :nro_ruc',
      ExpressionAttributeValues: { ':nro_ruc': '12345678901' }
    }));
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual([{ id: 1, name: 'Test Company' }]);
  });

  test('GET request without NRO_RUC should scan DynamoDB', async () => {
    const event = {
      requestContext: { http: { method: 'GET' } },
      body: JSON.stringify({ payload: {} })
    };

    mockDynamoDb.promise.mockResolvedValueOnce({ Items: [{ id: 1 }, { id: 2 }] });

    const result = await handler(event);

    expect(mockSSM.getParameter).toHaveBeenCalledTimes(2);
    expect(mockDynamoDb.scan).toHaveBeenCalledWith({ TableName: 'GRUPO5.FACT_EMPRESAS' });
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  test('Unsupported operation should return 400', async () => {
    const event = {
      requestContext: { http: { method: 'POST' } },
      body: JSON.stringify({ payload: {} })
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ error: 'Operación no soportada: "POST"' });
  });

  test('Should handle errors and return 500', async () => {
    const event = {
      requestContext: { http: { method: 'GET' } },
      body: JSON.stringify({ payload: { NRO_RUC: '12345678901' } })
    };

    mockDynamoDb.promise.mockRejectedValueOnce(new Error('DynamoDB error'));

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ error: 'DynamoDB error' });
  });
});

describe('DynamoDBService', () => {
  let dynamoService;
  let mockDynamoDb;
  let mockSSM;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDynamoDb = new AWS.DynamoDB.DocumentClient();
    mockSSM = new AWS.SSM();
    dynamoService = new DynamoDBService();

    // Mock SSM parameter responses
    mockSSM.promise
      .mockResolvedValueOnce({ Parameter: { Value: 'GRUPO5.FACT_EMPRESAS' } })
      .mockResolvedValueOnce({ Parameter: { Value: 'NRO_RUC-index' } });
  });

  test('initialize should fetch table and index names from SSM', async () => {
    await dynamoService.initialize();

    expect(mockSSM.getParameter).toHaveBeenCalledTimes(2);
    expect(dynamoService.TABLE_NAME).toBe('GRUPO5.FACT_EMPRESAS');
    expect(dynamoService.INDEX_NAME).toBe('NRO_RUC-index');
  });

  test('queryByNroRuc should call query with correct parameters', async () => {
    await dynamoService.initialize();
    await dynamoService.queryByNroRuc('12345678901');

    expect(mockDynamoDb.query).toHaveBeenCalledWith(expect.objectContaining({
      TableName: 'GRUPO5.FACT_EMPRESAS',
      IndexName: 'NRO_RUC-index',
      KeyConditionExpression: 'NRO_RUC = :nro_ruc',
      ExpressionAttributeValues: { ':nro_ruc': '12345678901' }
    }));
  });

  test('scanAll should call scan with correct parameters', async () => {
    await dynamoService.initialize();
    await dynamoService.scanAll();

    expect(mockDynamoDb.scan).toHaveBeenCalledWith({ TableName: 'GRUPO5.FACT_EMPRESAS' });
  });
});

describe('OperationHandler', () => {
  let operationHandler;
  let mockDynamoService;

  beforeEach(() => {
    mockDynamoService = {
      initialize: jest.fn(),
      queryByNroRuc: jest.fn(),
      scanAll: jest.fn()
    };
    operationHandler = new OperationHandler(mockDynamoService);
  });

  test('handleGet with NRO_RUC should call queryByNroRuc', async () => {
    mockDynamoService.queryByNroRuc.mockResolvedValueOnce({ Items: [{ id: 1 }] });

    const result = await operationHandler.handleGet({ NRO_RUC: '12345678901' });

    expect(mockDynamoService.initialize).toHaveBeenCalled();
    expect(mockDynamoService.queryByNroRuc).toHaveBeenCalledWith('12345678901');
    expect(result).toEqual({ statusCode: 200, body: JSON.stringify([{ id: 1 }]) });
  });

  test('handleGet without NRO_RUC should call scanAll', async () => {
    mockDynamoService.scanAll.mockResolvedValueOnce({ Items: [{ id: 1 }, { id: 2 }] });

    const result = await operationHandler.handleGet({});

    expect(mockDynamoService.initialize).toHaveBeenCalled();
    expect(mockDynamoService.scanAll).toHaveBeenCalled();
    expect(result).toEqual({ statusCode: 200, body: JSON.stringify([{ id: 1 }, { id: 2 }]) });
  });
});

describe('parseEvent', () => {
  test('should parse event with requestContext', () => {
    const event = {
      requestContext: { http: { method: 'GET' } },
      body: JSON.stringify({ payload: { NRO_RUC: '12345678901' } })
    };

    const result = parseEvent(event);

    expect(result).toEqual({
      operation: 'GET',
      payload: { NRO_RUC: '12345678901' }
    });
  });

  test('should parse event without requestContext', () => {
    const event = {
      operation: 'GET',
      payload: { NRO_RUC: '12345678901' }
    };

    const result = parseEvent(event);

    expect(result).toEqual({
      operation: 'GET',
      payload: { NRO_RUC: '12345678901' }
    });
  });
});
