const jobsService = require('./jobs.service');

async function handleCreateJob(req, res, next) {
  try {
    const jobResult = await jobsService.createJob(req.user.id, req.body);
    const { booking, ...job } = jobResult;
    return res.status(201).json({
      job,
      ...(booking ? { booking } : {})
    });
  } catch (error) {
    next(error);
  }
}

async function handleGetJob(req, res, next) {
  try {
    const job = await jobsService.getJobById(req.params.id, req.user);
    return res.status(200).json({ job });
  } catch (error) {
    next(error);
  }
}

async function handleGetJobs(req, res, next) {
  try {
    const { customer_id } = req.query;
    const jobs = await jobsService.getJobs({ customer_id }, req.user);
    return res.status(200).json({ jobs });
  } catch (error) {
    next(error);
  }
}

async function handleGetNearbyJobs(req, res, next) {
  try {
    const jobs = await jobsService.getNearbyJobs(req.query, req.user);
    return res.status(200).json({ jobs });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleCreateJob,
  handleGetJob,
  handleGetJobs,
  handleGetNearbyJobs
};
