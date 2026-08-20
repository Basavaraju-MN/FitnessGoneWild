const {
  spawn,
} = require('child_process');

const path = require('path');


const executePython = (payload) => {

  return new Promise(
    (resolve, reject) => {

      const scriptPath = path.join(
      __dirname,
      '../../scripts/python/phonepe_payment.py'
    );



      /*
       * Windows:
       *
       * If "python" doesn't work,
       * change this to "py".
       */
      const pythonCommand =
        process.env.PYTHON_COMMAND ||
        (process.platform === 'win32' ? 'py' : 'python3');


      const pythonProcess = spawn(
        pythonCommand,
        [scriptPath],
        {
          env: process.env,
        }
      );


      let output = '';
      let errorOutput = '';


      /*
       * Receive output from Python
       */
      pythonProcess.stdout.on(
        'data',
        (data) => {

          output += data.toString();

        }
      );


      /*
       * Receive Python errors
       */
      pythonProcess.stderr.on(
        'data',
        (data) => {

          errorOutput += data.toString();

        }
      );


      /*
       * Send JSON to Python through stdin.
       */
      pythonProcess.stdin.write(
        JSON.stringify(payload)
      );

      pythonProcess.stdin.end();


      /*
       * Python completed
       */
      pythonProcess.on(
        'close',
        (code) => {

          if (code !== 0) {

            console.error(
              'Python Error:',
              errorOutput
            );

            return reject(
              new Error(
                errorOutput ||
                'Python script execution failed'
              )
            );

          }


          try {

            const result =
              JSON.parse(
                output.trim()
              );


            if (result.success === false) {

              return reject(
                new Error(
                  result.message ||
                  'PhonePe operation failed'
                )
              );

            }


            resolve(result.data);

          } catch (error) {

            console.error(
              'Python raw output:',
              output
            );

            reject(
              new Error(
                'Invalid response received from Python'
              )
            );

          }

        }
      );


      pythonProcess.on(
        'error',
        (error) => {

          reject(
            new Error(
              `Unable to execute Python: ${error.message}`
            )
          );

        }
      );

    }
  );

};



exports.executePhonePe = async (
  action,
  data
) => {

  const allowedActions = [
    'create-payment',
    'check-status',
    'webhook',
  ];


  if (
    !allowedActions.includes(action)
  ) {

    throw new Error(
      `Invalid PhonePe action: ${action}`
    );

  }


  return executePython({
    action,
    data,
  });

};