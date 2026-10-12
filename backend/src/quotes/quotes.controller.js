const quotesService = require('./quotes.service');

async function handlePostQuote(req, res, next) {
  try {
    const quote = await quotesService.submitQuote({
      jobId: req.params.id,
      userId: req.user.id,
      pricePaise: req.body.price_paise,
      etaMinutes: req.body.eta_minutes,
      message: req.body.message
    });
    return res.status(201).json({ quote });
  } catch (err) {
    next(err);
  }
}

async function handleGetQuotes(req, res, next) {
  try {
    const quotes = await quotesService.getQuotesForJob({
      jobId: req.params.id,
      user: req.user,
      sort: req.query.sort
    });
    return res.status(200).json({ quotes });
  } catch (err) {
    next(err);
  }
}

async function handleAcceptQuote(req, res, next) {
  try {
    const booking = await quotesService.acceptQuote({
      jobId: req.params.id,
      quoteId: req.body.quote_id,
      user: req.user
    });
    return res.status(201).json({ booking });
  } catch (err) {
    next(err);
  }
}

async function handleAutoMatchJob(req, res, next) {
  try {
    const booking = await quotesService.autoMatchUrgentJob(req.params.id);
    if (!booking) {
      return res.status(200).json({
        booking: null,
        message: 'No available providers found within service radius'
      });
    }
    return res.status(200).json({ booking });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handlePostQuote,
  handleGetQuotes,
  handleAcceptQuote,
  handleAutoMatchJob
};
