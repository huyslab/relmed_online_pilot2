// Save data to REDCap
function saveDataREDCap(retry = 1) {

    const auto_number = window.record_id == undefined

    console.log(auto_number)

    var jspsych_data = jsPsych.data.get().json();

    var redcap_record = JSON.stringify([{
        record_id: auto_number ? 1 : window.record_id, // Mandatory, but if auto_number then ignored by REDcap
        prolific_pid: window.prolificPID,
        study_id: window.studyId,
        session_id: window.sessionId,
        start_time: window.startTime,
        exp_code_version: code_version,
        group: window.condition,
        jspsych_data: jspsych_data,
        auto_number: auto_number ? 'true' : 'false'
    }])

    fetch('https://h6pgstm0f9.execute-api.eu-north-1.amazonaws.com/prod/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: redcap_record
    })
    .then(data => {
        if (data.status === 200) {
            console.log('Data successfully submitted to REDCap');
        } else {
            console.error('Error submitting data:', data.message);
        }
        return data.json()
    })
    .then(data => {
        console.log(data)
        if (auto_number){
            window.record_id = JSON.parse('[' + data[0] + ']')[0]
        }
    }
    )
    .catch(error => {
        console.error('Error:', error);
        if (retry > 0) {
            console.log('Retrying to submit data...');
            saveDataREDCap(retry - 1);
        } else {
            console.error('Failed to submit data after retrying.');
        }
    });
}

// Function to call at the end of the experiment
function end_experiment() {

    // Save data
    saveDataREDCap(retry = 3);

    // Redirect
    window.location.replace("https://en.wikipedia.org/wiki/Recursive_islands_and_lakes")
}

// Function for formatting data from API
function format_date_from_string(s){
    const dateTime = new Date(s);

    // Get individual components
    const year = dateTime.getFullYear();
    const month = String(dateTime.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const day = String(dateTime.getDate()).padStart(2, '0');
    const hours = String(dateTime.getHours()).padStart(2, '0');
    const minutes = String(dateTime.getMinutes()).padStart(2, '0');
    const seconds = String(dateTime.getSeconds()).padStart(2, '0');

    // Format the date and time
    const formattedDate = `${year}-${month}-${day}`;
    const formattedTime = `${hours}:${minutes}:${seconds}`;

    return formattedDate + "_" + formattedTime
}

// Functions for computing remaining feedback after early stop
function countPLTAfterLastNonPLT(arr) {
    let count = 0;
    let foundNonPLT = false;
    
    // Iterate from the end to the beginning of the array
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i] !== "PLT") {
        // If a non-PLT string is found, stop the iteration
        foundNonPLT = true;
        break;
      } else {
        // If foundNonPLT is true and we encounter "PLT", increase the count
        count++;
      }
    }
  
    return count;
}

// Find maximum of two vectors in each positin, and return sum
function getSumofMax(arr1, arr2) {
    function add(accumulator, a) {
        return accumulator + a;
      }
      
// Assuming arr1 and arr2 are of the same length
    return arr1.map((value, index) => Math.max(value, arr2[index])).reduce(add, 0);
}

// Extract observed coins for lottery
function get_coins_from_data() {
    // Get block numbers for filtering
    let blocks = jsPsych.data.get().filter({trial_type: "PLT"}).select('block').values;

    // Get block valence for each trial
    let valence = jsPsych.data.get().filter({trial_type: "PLT"}).select('valence').values;

    // Get left and right outcome for each trial
    let outcomeRight = jsPsych.data.get().filter({trial_type: "PLT"}).select('outcomeRight').values;
    let outcomeLeft = jsPsych.data.get().filter({trial_type: "PLT"}).select('outcomeLeft').values;

    // Get choice
    let choice = jsPsych.data.get().filter({trial_type: "PLT"}).select('choice').values;

    let coins_for_lottery = []
    for (i=0; i<valence.length; i++){
        console.log(blocks[i] + "," + valence[i] + "," + outcomeRight[i] + "," + outcomeLeft[i] + "," + choice[i])
        if ((typeof blocks[i] !== "number") || choice[i] == "noresp"){
            console.log('skipped')
            continue
        }

        if (valence[i] == 1){
            coins_for_lottery.push(choice[i] == "right" ? outcomeRight[i] : outcomeLeft[i]);
            console.log("pushed" + (choice[i] == "right" ? outcomeRight[i] : outcomeLeft[i]))
        } else {
            coins_for_lottery.push(choice[i] == "right" ? -outcomeLeft[i] : -outcomeRight[i]);
            console.log("pushed " + (choice[i] == "right" ? -outcomeLeft[i] : -outcomeRight[i]))
        }
    }

    return coins_for_lottery
}

function computeCategoryProportions(originalArray){
    // Step 1: Calculate the frequency of each unique float value
    const frequencyMap = {};
    originalArray.forEach(value => {
        if (frequencyMap[value]) {
            frequencyMap[value]++;
        } else {
            frequencyMap[value] = 1;
        }
    });

    // Step 2: Calculate the proportions
    const totalSize = originalArray.length;
    const proportionMap = {};
    for (let value in frequencyMap) {
        proportionMap[value] = frequencyMap[value] / totalSize;
    }

    return proportionMap
}

// Create a represantative array of coins of n length
function createProportionalArray(originalArray, newSize) {
    
    // Steps 1 and 2: Compute proportions
    const proportionMap = computeCategoryProportions(originalArray);

    // Step 3: Calculate the counts for the new array
    const newCounts = {};
    let sumCounts = 0;
    for (let value in proportionMap) {
        newCounts[value] = Math.floor(proportionMap[value] * newSize);
        sumCounts += newCounts[value];
    }

    // Step 4: Distribute the remaining elements to ensure the new array has the correct size
    let remainingElements = newSize - sumCounts;
    while (remainingElements > 0) {
        for (let value in newCounts) {
            if (remainingElements > 0) {
                newCounts[value]++;
                remainingElements--;
            }
        }
    }

    // Step 5: Create the new array based on the calculated counts
    const newArray = [];
    for (let value in newCounts) {
        for (let i = 0; i < newCounts[value]; i++) {
            newArray.push(parseFloat(value)); // Convert the key back to float
        }
    }

    return newArray;
}
