const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const requireLogin = require('../middleware/requireLogin.js');
const requireAdmin = require('../middleware/adminMiddleware.js');
const Job = mongoose.model('Job');
const User = mongoose.model('User');

// @route POST /api/jobs/create
// @desc Create a new job post
router.post('/create', requireLogin,requireAdmin, async (req, res) => {
  const { title, description, location, company } = req.body;

  if (!title || !description || !location || !company) {
    return res.status(422).json({ error: 'Please fill in all fields' });
  }

  try {
    const job = new Job({
      title,
      description,
      location,
      company,
      postedBy: req.user._id,
    });

    await job.save();
    res.json({ job });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// @route GET /api/jobs/all
// @desc Get all jobs
router.get('/all', async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate('postedBy', '_id name')
      .populate('applicants.user', 'name email')
      .exec();

    res.json({ jobs });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// @route GET /api/jobs/:id
// @desc Get a specific job by ID
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('postedBy', '_id name')
      .populate('applicants.user', 'name email')
      .exec();

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ job });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// @desc Apply for a job
router.post('/apply/:jobId', requireLogin, async (req, res) => {
    try {
      // Restrict admin from applying
      if (req.user.role === 'admin') {
        return res.status(403).json({ error: 'Admins cannot apply for jobs' });
      }
  
      const job = await Job.findById(req.params.jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
  
      // Check if user already applied
      if (job.applicants.some(applicant => applicant.user.toString() === req.user._id.toString())) {
        return res.status(400).json({ error: 'You have already applied for this job' });
      }
  
      job.applicants.push({ user: req.user._id, status: 'pending' });
      await job.save();
  
      res.json({ message: 'Job application submitted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
});
  

// Admin-only route to view applicants for a particular job
router.get('/job-applicants/:jobId', requireLogin,requireAdmin, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
  
      const job = await Job.findById(req.params.jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
  
      // Check if the admin is the creator of the job
      if (job.postedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'You can only access jobs you created' });
      }
  
      res.json(job.applicants);
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
});

  // @route DELETE /api/jobs/delete/:id
  // @desc Delete a job post
router.delete('/delete/:id', requireLogin, requireAdmin, async (req, res) => {
try {
    const job = await Job.findById(req.params.id);
    if (!job) {
    return res.status(404).json({ error: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Not authorized to delete this job' });
    }

    await job.remove();
    res.json({ message: 'Job deleted successfully' });
} catch (err) {
    res.status(500).send('Server error');
}
});

  // jobs/edit/:jobId
router.put('/update-job/:jobId', requireLogin,requireAdmin, async (req, res) => {
const { title, description, location, company } = req.body;

try {
    if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
    }

    const job = await Job.findById(req.params.jobId);
    if (!job) {
    return res.status(404).json({ error: 'Job not found' });
    }

    // Check if the admin is the creator of the job
    if (job.postedBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'You can only update jobs you created' });
    }

    job.title = title || job.title;
    job.description = description || job.description;
    job.location = location || job.location;
    job.company = company || job.company;

    await job.save();

    res.json({ message: 'Job updated successfully', job });
} catch (err) {
    console.error(err);
    res.status(500).send('Server error');
}
});


  // to get all the applied jobs by the logged in user and also show the status
router.get('/user/applied-jobs', requireLogin, async (req, res) => {
console.log('Route /applied-jobs is hit');
try {

    console.log('User ID:', req.user._id); // Debug the user ID

    const jobs = await Job.find({ 'applicants.user': req.user._id })
    .select('title description company location applicants')
    .populate('applicants.user', 'name email'); // Populate user details

    console.log('Jobs Query Result:', jobs); // Debug the queried jobs

    const appliedJobs = jobs.map(job => {
    const applicant = job.applicants.find(applicant =>
        applicant.user._id.toString() === req.user._id.toString()
    );
    return {
        jobId: job._id,
        title: job.title,
        description: job.description,
        company: job.company,
        location: job.location,
        status: applicant ? applicant.status : 'pending', // Default to 'pending'
    };
    });

    console.log('Applied Jobs Result:', appliedJobs); // Debug the transformed result

    res.json(appliedJobs);
} catch (err) {
    console.error('Error in /applied-jobs:', err.message); // Improved error logging
    res.status(500).send('Server error');
}
});



//updating status for each applicant so that it is reflected in job status for users applications
router.put('/admin/job-applicant-status/:jobId/:applicantId', requireLogin, requireAdmin, async (req, res) => {
    const { jobId, applicantId } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
    }

    try {
        // Ensure the job exists and is created by the logged-in admin
        const job = await Job.findById(jobId).populate('applicants.user', 'name email');
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        if (job.postedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'You are not authorized to manage this job' });
        }

        // Find the applicant in the job's applicants list
        const applicant = job.applicants.find((app) => app.user._id.toString() === applicantId);
        if (!applicant) {
            return res.status(404).json({ error: 'Applicant not found for this job' });
        }

        // Update the applicant's status in the job
        applicant.status = status;
        await job.save();

        // Update the user's status for this job
        const user = await User.findById(applicantId);
        if (user) {
            const statusIndex = user.status.findIndex((stat) => stat.job.toString() === jobId);
            if (statusIndex > -1) {
                // Update existing status
                user.status[statusIndex].status = status;
            } else {
                // Add new status
                user.status.push({ job: jobId, status });
            }
            await user.save();
        }

        res.json({
            message: 'Status updated successfully',
            job,
            populatedApplicants: job.applicants, // Includes populated user data
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


module.exports = router;
