import { setupHub } from '../helpers/server';

describe('GET /api/rewards/proofs', function () {
  let { getPrisma, request } = setupHub(this);

  this.beforeEach(async function () {
    let prismaClient = await getPrisma();

    const proofs = [
      {
        rewardProgramId: '0x0885ce31D73b63b0Fcb1158bf37eCeaD8Ff0fC72',
        payee: '0x159ADe032073d930E85f95AbBAB9995110c43C71',
        leaf: '0x000000000000000000000000979c9f171fb6e9bc501aa7eed71ca8dc27cf1185000000000000000000000000000000000000000000000000000000000144ee53000000000000000000000000000000000000000000000000000000000144ee53000000000000000000000000000000000000000000000000000000000150cbd30000000000000000000000000000000000000000000000000000000000000001000000000000000000000000159ade032073d930e85f95abbab9995110c43c7100000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000052031d287bb58e26a379a7fec2c84acb54f54fe30000000000000000000000000000000000000000000000008ac7230489e80000',
        paymentCycle: 21294675,
        proofBytes: [
          '0xe9a069e053d2d6c63156b847dfe5a65621f12f9a48dd99334686a00f4caa81cd',
          '0x057ed0d6e7713f8ca78a76215de6946067f8b1129e04a641bda4f792f9fb9f1d',
          '0x61107f8f8816b0a36bd6903b12e756a07fce506def94113ee0720880e040cbb9',
          '0xbbeb60af12155c9a1f1f4297daaad152f5200ae2d157dab38717cf2e5f573b18',
        ],
        tokenType: 1,
        validFrom: 21294675,
        validTo: 22072275,
        explanationId: null,
        explanationData: {},
      },
      {
        rewardProgramId: '0xab20c80fcc025451a3fc73bB953aaE1b9f640949',
        payee: '0x159ADe032073d930E85f95AbBAB9995110c43C71',
        leaf: '0x000000000000000000000000979c9f171fb6e9bc501aa7eed71ca8dc27cf1185000000000000000000000000000000000000000000000000000000000144ee54000000000000000000000000000000000000000000000000000000000144ee54000000000000000000000000000000000000000000000000000000000150cbd40000000000000000000000000000000000000000000000000000000000000001000000000000000000000000159ade032073d930e85f95abbab9995110c43c7100000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000052031d287bb58e26a379a7fec2c84acb54f54fe30000000000000000000000000000000000000000000000008ac7230489e80000',
        paymentCycle: 21294676,
        proofBytes: [
          '0x99c5d6afc0ff54311c2c0131e8ada7dbfebc9d9cd734e671d2fcd2e0fefcb3c1',
          '0x66444f97628299674e92fba54e4ec6ec7fb055e0dc34a9b575f38f6b390f870c',
          '0xca6328796b3f8d4a75ab16023e5bdd1c245af873ae8ea7becb881c6dbbf567c1',
          '0x81817fadb2fbe6482e03eb218380800c6452cbac946979dab2d7107632dba303',
        ],
        tokenType: 1,
        validFrom: 21294676,
        validTo: 22072276,
        explanationId: null,
        explanationData: {},
      },
      {
        rewardProgramId: '0x0885ce31D73b63b0Fcb1158bf37eCeaD8Ff0fC72',
        payee: '0x5ae158659942D346bd788b17B2307972DAEb6dDd',
        leaf: '0x0000000000000000000000000885ce31d73b63b0fcb1158bf37ecead8ff0fc720000000000000000000000000000000000000000000000000000000001a01e8f0000000000000000000000000000000000000000000000000000000001a01e8f0000000000000000000000000000000000000000000000000000000001abfc0f00000000000000000000000000000000000000000000000000000000000000010000000000000000000000005ae158659942d346bd788b17b2307972daeb6ddd00000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000040000000000000000000000000b0427e9f03eb448d030be3ebc96f423857ceeb2f000000000000000000000000000000000000000000000000016345785d8a0000',
        paymentCycle: 27270799,
        proofBytes: ['0x'],
        tokenType: 1,
        validFrom: 27270799,
        validTo: 28048399,
        explanationId: null,
        explanationData: {},
      },
    ];
    await prismaClient.rewardProof.createMany({
      data: proofs,
    });
  });

  it('responds with 200 filters by payee', async function () {
    await request()
      .get('/api/rewards/proofs/0x159ADe032073d930E85f95AbBAB9995110c43C71')
      .set('Accept', 'application/vnd.api+json')
      .expect(200)
      .expect({
        data: [
          {
            id: '0x000000000000000000000000979c9f171fb6e9bc501aa7eed71ca8dc27cf1185000000000000000000000000000000000000000000000000000000000144ee53000000000000000000000000000000000000000000000000000000000144ee53000000000000000000000000000000000000000000000000000000000150cbd30000000000000000000000000000000000000000000000000000000000000001000000000000000000000000159ade032073d930e85f95abbab9995110c43c7100000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000052031d287bb58e26a379a7fec2c84acb54f54fe30000000000000000000000000000000000000000000000008ac7230489e80000',
            type: 'reward-proofs',
            attributes: {
              rewardProgramId: '0x0885ce31D73b63b0Fcb1158bf37eCeaD8Ff0fC72',
              payee: '0x159ADe032073d930E85f95AbBAB9995110c43C71',
              leaf: '0x000000000000000000000000979c9f171fb6e9bc501aa7eed71ca8dc27cf1185000000000000000000000000000000000000000000000000000000000144ee53000000000000000000000000000000000000000000000000000000000144ee53000000000000000000000000000000000000000000000000000000000150cbd30000000000000000000000000000000000000000000000000000000000000001000000000000000000000000159ade032073d930e85f95abbab9995110c43c7100000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000052031d287bb58e26a379a7fec2c84acb54f54fe30000000000000000000000000000000000000000000000008ac7230489e80000',
              paymentCycle: 21294675,
              proofBytes: [
                '0xe9a069e053d2d6c63156b847dfe5a65621f12f9a48dd99334686a00f4caa81cd',
                '0x057ed0d6e7713f8ca78a76215de6946067f8b1129e04a641bda4f792f9fb9f1d',
                '0x61107f8f8816b0a36bd6903b12e756a07fce506def94113ee0720880e040cbb9',
                '0xbbeb60af12155c9a1f1f4297daaad152f5200ae2d157dab38717cf2e5f573b18',
              ],
              tokenType: 1,
              validFrom: 21294675,
              validTo: 22072275,
              explanationId: null,
              explanationData: {},
            },
          },
          {
            id: '0x000000000000000000000000979c9f171fb6e9bc501aa7eed71ca8dc27cf1185000000000000000000000000000000000000000000000000000000000144ee54000000000000000000000000000000000000000000000000000000000144ee54000000000000000000000000000000000000000000000000000000000150cbd40000000000000000000000000000000000000000000000000000000000000001000000000000000000000000159ade032073d930e85f95abbab9995110c43c7100000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000052031d287bb58e26a379a7fec2c84acb54f54fe30000000000000000000000000000000000000000000000008ac7230489e80000',
            type: 'reward-proofs',
            attributes: {
              rewardProgramId: '0xab20c80fcc025451a3fc73bB953aaE1b9f640949',
              payee: '0x159ADe032073d930E85f95AbBAB9995110c43C71',
              leaf: '0x000000000000000000000000979c9f171fb6e9bc501aa7eed71ca8dc27cf1185000000000000000000000000000000000000000000000000000000000144ee54000000000000000000000000000000000000000000000000000000000144ee54000000000000000000000000000000000000000000000000000000000150cbd40000000000000000000000000000000000000000000000000000000000000001000000000000000000000000159ade032073d930e85f95abbab9995110c43c7100000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000052031d287bb58e26a379a7fec2c84acb54f54fe30000000000000000000000000000000000000000000000008ac7230489e80000',
              paymentCycle: 21294676,
              proofBytes: [
                '0x99c5d6afc0ff54311c2c0131e8ada7dbfebc9d9cd734e671d2fcd2e0fefcb3c1',
                '0x66444f97628299674e92fba54e4ec6ec7fb055e0dc34a9b575f38f6b390f870c',
                '0xca6328796b3f8d4a75ab16023e5bdd1c245af873ae8ea7becb881c6dbbf567c1',
                '0x81817fadb2fbe6482e03eb218380800c6452cbac946979dab2d7107632dba303',
              ],
              tokenType: 1,
              validFrom: 21294676,
              validTo: 22072276,
              explanationId: null,
              explanationData: {},
            },
          },
        ],
      })
      .expect('Content-Type', 'application/vnd.api+json');
  });
  it('responds with 200 filters by rewardProgramId', async function () {
    await request()
      .get('/api/rewards/proofs/0x159ADe032073d930E85f95AbBAB9995110c43C71')
      .query({ rewardProgramId: '0x0885ce31D73b63b0Fcb1158bf37eCeaD8Ff0fC72' })
      .set('Accept', 'application/vnd.api+json')
      .expect(200)
      .expect('Content-Type', 'application/vnd.api+json')
      .expect({
        data: [
          {
            id: '0x000000000000000000000000979c9f171fb6e9bc501aa7eed71ca8dc27cf1185000000000000000000000000000000000000000000000000000000000144ee53000000000000000000000000000000000000000000000000000000000144ee53000000000000000000000000000000000000000000000000000000000150cbd30000000000000000000000000000000000000000000000000000000000000001000000000000000000000000159ade032073d930e85f95abbab9995110c43c7100000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000052031d287bb58e26a379a7fec2c84acb54f54fe30000000000000000000000000000000000000000000000008ac7230489e80000',
            type: 'reward-proofs',
            attributes: {
              rewardProgramId: '0x0885ce31D73b63b0Fcb1158bf37eCeaD8Ff0fC72',
              payee: '0x159ADe032073d930E85f95AbBAB9995110c43C71',
              leaf: '0x000000000000000000000000979c9f171fb6e9bc501aa7eed71ca8dc27cf1185000000000000000000000000000000000000000000000000000000000144ee53000000000000000000000000000000000000000000000000000000000144ee53000000000000000000000000000000000000000000000000000000000150cbd30000000000000000000000000000000000000000000000000000000000000001000000000000000000000000159ade032073d930e85f95abbab9995110c43c7100000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000052031d287bb58e26a379a7fec2c84acb54f54fe30000000000000000000000000000000000000000000000008ac7230489e80000',
              paymentCycle: 21294675,
              proofBytes: [
                '0xe9a069e053d2d6c63156b847dfe5a65621f12f9a48dd99334686a00f4caa81cd',
                '0x057ed0d6e7713f8ca78a76215de6946067f8b1129e04a641bda4f792f9fb9f1d',
                '0x61107f8f8816b0a36bd6903b12e756a07fce506def94113ee0720880e040cbb9',
                '0xbbeb60af12155c9a1f1f4297daaad152f5200ae2d157dab38717cf2e5f573b18',
              ],
              tokenType: 1,
              validFrom: 21294675,
              validTo: 22072275,
              explanationId: null,
              explanationData: {},
            },
          },
        ],
      });
  });
  it('responds with 422 non valid payee', async function () {
    await request()
      .get('/api/rewards/proofs/wrongPayeeAddress')
      .set('Accept', 'application/vnd.api+json')
      .expect(422)
      .expect({
        status: '422',
        title: 'Invalid payee address',
      });
  });
  it('responds with 422 non valid reward program id', async function () {
    await request()
      .get('/api/rewards/proofs/0x159ADe032073d930E85f95AbBAB9995110c43C71')
      .query({ rewardProgramId: 'wrongRewardProgram' })
      .set('Accept', 'application/vnd.api+json')
      .expect(422)
      .expect({
        status: '422',
        title: 'Invalid reward program id',
      });
  });
});
