export default function route(router) {
  router.post('/save', async (req, res) => {
    req.gb.logger.info('Saving code', { room: req.body.room });
    await req.gb.mongo.saveCode(req.body.room, req.body.code);
    res.json({ ok: true });
  });

  router.post('/get', async (req, res) => {
    req.gb.logger.info('Loading code', { room: req.body.room });
    const code = await req.gb.mongo.getCode(req.body.room);
    res.json({ code });
  });
}
