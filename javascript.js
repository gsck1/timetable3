const API_URL = "https://script.google.com/macros/s/AKfycbzudGCT58x0lPGOe4T_0Yp0RQBXTxtOObmLkGxYplLleun8Mmfr4zTsmgq3EXCeQLvc/exec";
let db = {};
let times = [];
let saturdayTimes = [];
let days = [];
let allRooms = [];
let originalTimetable = [];
let timetable = [];

let studentViewMode = "daily";
let teacherViewMode = "daily";

function clean(value) {
return String(value == null ? "" : value).trim();
}

async function loadDatabase() {
try {
const response = await fetch(API_URL + "?action=get&t=" + Date.now());

    if (!response.ok) {
        throw new Error("API connection failed");
    }

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.message || "Failed to load data");
    }

    db = data;

    times = (data.meta.times || []).map(clean);
    saturdayTimes = (data.meta.saturdayTimes || []).map(clean);
    days = (data.meta.days || []).map(clean);
    allRooms = (data.meta.allRooms || []).map(clean);

    timetable = (data.timetable || []).map(item => ({
        id: clean(item.id),
        day: clean(item.day),
        class: clean(item.class),
        time: clean(item.time),
        subject: clean(item.subject),
        teacher: clean(item.teacher),
        room: clean(item.room)
    }));

    originalTimetable = JSON.parse(JSON.stringify(timetable));

    console.log("GOOGLE SHEET DATA:", timetable);
    console.log("TOTAL LECTURES:", timetable.length);

    goHome();

} catch (error) {
    console.error("Google Sheet Error:", error);
    alert("Failed to load timetable from Google Sheet: " + error.message);
}

}

async function sendToAPI(data) {

const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(data)
});

const text = await response.text();

let result;

try {
    result = JSON.parse(text);
} catch (e) {
    throw new Error("Invalid response from Google Sheet API");
}

if (!result.success) {
    throw new Error(result.message || "API request failed");
}

return result;

}

function hideAll() {
document.querySelectorAll(".card").forEach(x => {
x.classList.add("hidden");
});
}

function goHome() {
hideAll();

const home = document.getElementById("home");

if (home) {
    home.classList.remove("hidden");
}

}

function showStudent() {
hideAll();

document.getElementById("student").classList.remove("hidden");

setToday("studentDate");

setStudentView("daily");

}

function showTeacher() {
hideAll();

document.getElementById("teacher").classList.remove("hidden");

loadTeachersDropdown();

setToday("teacherDate");
setToday("teacherCheckDate");

setTeacherView("daily");

}

function showAdmin() {
hideAll();

document.getElementById("adminLogin").classList.remove("hidden");

}

function yearChanged() {

const year = clean(
    document.getElementById("studentYear").value
);

const box = document.getElementById("streamBox");

if (
    year === "BCA-I" ||
    year === "BCA-II" ||
    year === "BCA-III"
) {
    box.classList.remove("hidden");
} else {
    box.classList.add("hidden");
}

}

function setStudentView(mode) {

studentViewMode = mode;

if (mode === "daily") {

    document.getElementById("studentBtnDaily").classList.add("active");
    document.getElementById("studentBtnWeekly").classList.remove("active");

    document.getElementById("studentDateBox").classList.remove("hidden");

} else {

    document.getElementById("studentBtnWeekly").classList.add("active");
    document.getElementById("studentBtnDaily").classList.remove("active");

    document.getElementById("studentDateBox").classList.add("hidden");
}

}

function setTeacherView(mode) {

teacherViewMode = mode;

document.getElementById("teacherBtnDaily").classList.remove("active");
document.getElementById("teacherBtnWeekly").classList.remove("active");
document.getElementById("teacherBtnAvailability").classList.remove("active");

if (mode === "daily") {

    document.getElementById("teacherBtnDaily").classList.add("active");

    document.getElementById("teacherDateBox").classList.remove("hidden");
    document.getElementById("teacherAvailabilityBox").classList.add("hidden");

    document.getElementById("teacherActionBtn").style.display = "inline-block";
    document.getElementById("teacherActionBtn").innerText = "Show Timetable";

} else if (mode === "weekly") {

    document.getElementById("teacherBtnWeekly").classList.add("active");

    document.getElementById("teacherDateBox").classList.add("hidden");
    document.getElementById("teacherAvailabilityBox").classList.add("hidden");

    document.getElementById("teacherActionBtn").style.display = "inline-block";
    document.getElementById("teacherActionBtn").innerText = "Show Timetable";

} else {

    document.getElementById("teacherBtnAvailability").classList.add("active");

    document.getElementById("teacherDateBox").classList.add("hidden");
    document.getElementById("teacherAvailabilityBox").classList.remove("hidden");

    document.getElementById("teacherActionBtn").style.display = "none";

    checkTeacherAvailability();
}

}

function loadTeachersDropdown() {

const teachers = [
    ...new Set(
        timetable
            .map(x => clean(x.teacher))
            .filter(x => x !== "")
    )
];

const select = document.getElementById("teacherSelect");

if (select) {

    select.innerHTML = "<option value=''>Select Teacher</option>";

    teachers.forEach(t => {
        select.innerHTML +=
            "<option value=\"" + t + "\">" + t + "</option>";
    });
}

const filterSelect = document.getElementById("filterTeacher");

if (filterSelect) {

    const oldValue = filterSelect.value;

    filterSelect.innerHTML =
        "<option value=''>All Teachers</option>";

    teachers.forEach(t => {
        filterSelect.innerHTML +=
            "<option value=\"" + t + "\">" + t + "</option>";
    });

    filterSelect.value = oldValue;
}

}

function getStudentClass() {

const year = clean(
    document.getElementById("studentYear").value
);

if (
    year === "BCA-I" ||
    year === "BCA-II" ||
    year === "BCA-III"
) {

    const streamElement =
        document.getElementById("studentStream");

    const stream = streamElement
        ? clean(streamElement.value).toUpperCase()
        : "";

    if (stream === "AI") return year + " (AI)";
    if (stream === "DS") return year + " (DS)";

    return year;
}

return year;

}

function normalizeStudentClass(value) {

return clean(value)
    .replace(/\s+/g, " ")
    .replace(/\(\s*/g, " (")
    .replace(/\s*\)/g, ")")
    .trim()
    .toLowerCase();

}

function getStudentClasses() {

const year = clean(
    document.getElementById("studentYear").value
);

if (!year) return [];

const classes = [year];

if (
    year === "BCA-I" ||
    year === "BCA-II" ||
    year === "BCA-III"
) {

    const streamElement =
        document.getElementById("studentStream");

    const stream = streamElement
        ? clean(streamElement.value).toUpperCase()
        : "";

    if (stream === "AI") {

        classes.push(
            year + " (AI)"
        );

    } else if (stream === "DS") {

        classes.push(
            year + " (DS)"
        );
    }
}

return classes.map(normalizeStudentClass);

}

function isStudentClassMatch(
itemClass,
selectedClasses
) {

const value =
    normalizeStudentClass(itemClass);

return selectedClasses.some(cls =>
    value === normalizeStudentClass(cls)
);

}

function loadStudentTimetableDisplay() {

const name = clean(
    document.getElementById("studentName").value
);

const cls = getStudentClass();

const selectedClasses =
    getStudentClasses();

if (
    !name ||
    !cls ||
    selectedClasses.length === 0
) {

    alert(
        "Please enter your name and select year/stream."
    );

    return;
}

if (studentViewMode === "daily") {

    const date =
        document.getElementById("studentDate").value;

    if (!date) {

        alert("Please select a date.");

        return;
    }

    const day = new Date(
        date + "T00:00:00"
    ).toLocaleDateString(
        "en-US",
        {
            weekday: "long"
        }
    );

    const data =
        timetable.filter(x =>
            clean(x.day).toLowerCase() ===
            day.toLowerCase() &&
            isStudentClassMatch(
                x.class,
                selectedClasses
            )
        );

    let html =
        "<div class='info'>" +
        "<b>Student:</b> " +
        name +
        "<br>" +
        "<b>Class:</b> " +
        cls +
        "<br>" +
        "<b>Date:</b> " +
        date +
        " (" +
        day +
        ")" +
        "</div>";

    html += createDayTable(
        day,
        cls,
        data
    );

    document.getElementById(
        "studentResult"
    ).innerHTML = html;

} else {

    let html =
        "<div class='info'>" +
        "<b>Student:</b> " +
        name +
        "<br>" +
        "<b>Class:</b> " +
        cls +
        "</div>" +
        "<h3>Weekly Time Table</h3>";

    days.forEach(day => {

        const dayData =
            timetable.filter(x =>
                clean(x.day).toLowerCase() ===
                clean(day).toLowerCase() &&
                isStudentClassMatch(
                    x.class,
                    selectedClasses
                )
            );

        html +=
            "<h4>" +
            day +
            "</h4>";

        html += createDayTable(
            day,
            cls,
            dayData
        );
    });

    document.getElementById(
        "studentResult"
    ).innerHTML = html;
}

}

function loadTeacherTimetableDisplay() {

const teacher = clean(
    document.getElementById("teacherSelect").value
);

if (!teacher) {

    alert("Please select a teacher.");

    return;
}

if (teacherViewMode === "daily") {

    const date =
        document.getElementById("teacherDate").value;

    if (!date) {

        alert("Please select a date.");

        return;
    }

    const day = new Date(
        date + "T00:00:00"
    ).toLocaleDateString(
        "en-US",
        {
            weekday: "long"
        }
    );

    const data =
        timetable.filter(x =>
            clean(x.day).toLowerCase() ===
            day.toLowerCase() &&
            clean(x.teacher).toLowerCase() ===
            teacher.toLowerCase()
        );

    let html =
        "<div class='info'>" +
        "<b>Teacher:</b> " +
        teacher +
        "<br>" +
        "<b>Date:</b> " +
        date +
        " (" +
        day +
        ")" +
        "</div>";

    if (data.length === 0) {

        html +=
            "<h3>No lectures scheduled for this day.</h3>";

    } else {

        html +=
            "<div class='table-scroll'>" +
            "<table>" +
            "<tr>" +
            "<th>Time</th>" +
            "<th>Class</th>" +
            "<th>Subject</th>" +
            "<th>Room</th>" +
            "</tr>";

        data.forEach(x => {

            html +=
                "<tr>" +
                "<td>" +
                x.time +
                "</td>" +
                "<td>" +
                x.class +
                "</td>" +
                "<td>" +
                x.subject +
                "</td>" +
                "<td>" +
                x.room +
                "</td>" +
                "</tr>";
        });

        html +=
            "</table></div>";
    }

    document.getElementById(
        "teacherResult"
    ).innerHTML = html;

} else if (
    teacherViewMode === "weekly"
) {

    let html =
        "<div class='info'>" +
        "<b>Teacher:</b> " +
        teacher +
        "</div>" +
        "<h3>Weekly Teaching Schedule</h3>";

    let found = false;

    days.forEach(day => {

        const dayData =
            timetable.filter(x =>
                clean(x.day).toLowerCase() ===
                clean(day).toLowerCase() &&
                clean(x.teacher).toLowerCase() ===
                teacher.toLowerCase()
            );

        if (dayData.length > 0) {

            found = true;

            html +=
                "<h4>" +
                day +
                "</h4>";

            html +=
                "<div class='table-scroll'>" +
                "<table>" +
                "<tr>" +
                "<th>Time</th>" +
                "<th>Class</th>" +
                "<th>Subject</th>" +
                "<th>Room</th>" +
                "</tr>";

            dayData.forEach(x => {

                html +=
                    "<tr>" +
                    "<td>" +
                    x.time +
                    "</td>" +
                    "<td>" +
                    x.class +
                    "</td>" +
                    "<td>" +
                    x.subject +
                    "</td>" +
                    "<td>" +
                    x.room +
                    "</td>" +
                    "</tr>";
            });

            html +=
                "</table></div>";
        }
    });

    if (!found) {

        html +=
            "<h3>No lectures found.</h3>";
    }

    document.getElementById(
        "teacherResult"
    ).innerHTML = html;
}

}

function checkTeacherAvailability() {

const date =
    document.getElementById(
        "teacherCheckDate"
    ).value;

if (!date) return;

const day = new Date(
    date + "T00:00:00"
).toLocaleDateString(
    "en-US",
    {
        weekday: "long"
    }
);

const slotList =
    day === "Saturday"
        ? saturdayTimes
        : times;

let html =
    "<h4>Availability for " +
    date +
    " (" +
    day +
    ")</h4>";

html +=
    "<div class='table-scroll'>" +
    "<table>" +
    "<tr>" +
    "<th>Time Slot</th>" +
    "<th>Room Status</th>" +
    "</tr>";

slotList.forEach(time => {

    const bookedEntries =
        timetable.filter(x =>
            clean(x.day).toLowerCase() ===
            day.toLowerCase() &&
            clean(x.time) ===
            clean(time)
        );

    const occupiedRooms =
        bookedEntries.map(
            x => clean(x.room)
        );

    const freeRooms =
        allRooms.filter(r =>
            !occupiedRooms.includes(
                clean(r)
            )
        );

    html +=
        "<tr>" +
        "<td><b>" +
        time +
        "</b></td>" +
        "<td style='text-align:left;'>";

    if (freeRooms.length > 0) {

        html +=
            "<span class='available-badge'>" +
            "🟢 Available Rooms: " +
            freeRooms.join(", ") +
            "</span><br>";

    } else {

        html +=
            "<span class='occupied-badge'>" +
            "🔴 All Rooms Occupied" +
            "</span><br>";
    }

    if (bookedEntries.length > 0) {

        html +=
            "<small style='color:#555;display:inline-block;margin-top:4px;'>Booked: ";

        bookedEntries.forEach(b => {

            html +=
                "[" +
                b.room +
                " → " +
                b.class +
                " (" +
                b.subject +
                ")] ";
        });

        html +=
            "</small>";
    }

    html +=
        "</td></tr>";
});

html +=
    "</table></div>";

document.getElementById(
    "teacherResult"
).innerHTML = html;

}

function runAdminAvailabilityCheck() {

const date =
    document.getElementById(
        "adminCheckDate"
    ).value;

const specificRoom =
    document.getElementById(
        "adminCheckRoom"
    ).value;

const container =
    document.getElementById(
        "adminAvailabilityResult"
    );

if (!date) {

    container.innerHTML =
        "<p style='color:#666;'>Please select a date above to scan available slots.</p>";

    return;
}

const day = new Date(
    date + "T00:00:00"
).toLocaleDateString(
    "en-US",
    {
        weekday: "long"
    }
);

const slotList =
    day === "Saturday"
        ? saturdayTimes
        : times;

const roomsToCheck =
    specificRoom
        ? [specificRoom]
        : allRooms;

let html =
    "<h4>Open Slots for " +
    date +
    " (" +
    day +
    ") " +
    (
        specificRoom
            ? "in " +
              specificRoom
            : ""
    ) +
    "</h4>";

html +=
    "<div class='table-scroll'>" +
    "<table>" +
    "<tr>" +
    "<th>Time Slot</th>" +
    "<th>Available Rooms</th>" +
    "<th>Current Occupants</th>" +
    "</tr>";

slotList.forEach(time => {

    const booked =
        timetable.filter(x =>
            clean(x.day).toLowerCase() ===
            day.toLowerCase() &&
            clean(x.time) ===
            clean(time)
        );

    const occupiedRooms =
        booked.map(
            x => clean(x.room)
        );

    const freeRooms =
        roomsToCheck.filter(r =>
            !occupiedRooms.includes(
                clean(r)
            )
        );

    html +=
        "<tr>" +
        "<td><b>" +
        time +
        "</b></td>" +
        "<td>";

    if (freeRooms.length > 0) {

        html +=
            "<span class='available-badge'>" +
            freeRooms.join(", ") +
            "</span>";

    } else {

        html +=
            "<span class='occupied-badge'>None</span>";
    }

    html +=
        "</td>" +
        "<td style='text-align:left;'><small>";

    if (booked.length > 0) {

        booked.forEach(b => {

            html +=
                "<b>" +
                b.room +
                "</b>: " +
                b.class +
                " (" +
                b.subject +
                ")<br>";
        });

    } else {

        html +=
            "All rooms free";
    }

    html +=
        "</small></td></tr>";
});

html +=
    "</table></div>";

container.innerHTML = html;

}

function createDayTable(
day,
cls,
data
) {

const slotList =
    clean(day) === "Saturday"
        ? saturdayTimes
        : times;

let html =
    "<div class='table-scroll'>" +
    "<table>" +
    "<tr>" +
    "<th>Time</th>" +
    "<th>Subject</th>" +
    "<th>Teacher</th>" +
    "<th>Room</th>" +
    "</tr>";

slotList.forEach(time => {

    const lectures =
        data.filter(x =>
            clean(x.time) ===
            clean(time)
        );

    if (lectures.length > 0) {

        lectures.forEach(
            lecture => {

                const isLab =
                    clean(
                        lecture.subject
                    )
                        .toUpperCase()
                        .includes("LAB");

                html +=
                    "<tr>" +
                    "<td>" +
                    time +
                    "</td>" +
                    "<td>" +
                    "<div class='lecture " +
                    (
                        isLab
                            ? "lab"
                            : ""
                    ) +
                    "'>" +
                    "<b>" +
                    lecture.subject +
                    "</b>" +
                    "</div>" +
                    "</td>" +
                    "<td>" +
                    (
                        lecture.teacher ||
                        "-"
                    ) +
                    "</td>" +
                    "<td>" +
                    lecture.room +
                    "</td>" +
                    "</tr>";
            }
        );

    } else {

        html +=
            "<tr>" +
            "<td>" +
            time +
            "</td>" +
            "<td colspan='3' class='free'>" +
            "Free" +
            "</td>" +
            "</tr>";
    }
});

html +=
    "</table></div>";

return html;

}

function adminLogin() {

const id =
    document.getElementById(
        "adminId"
    ).value;

const password =
    document.getElementById(
        "adminPassword"
    ).value;

if (
    id === "admin" &&
    password === "1234"
) {

    hideAll();

    document
        .getElementById("adminPanel")
        .classList.remove("hidden");

    setToday(
        "adminCheckDate"
    );

    loadAdmin();

} else {

    document
        .getElementById("loginMsg")
        .innerHTML =
        "❌ Wrong ID or Password";
}

}

function loadTimeOptions() {

const select =
    document.getElementById(
        "aTime"
    );

select.innerHTML = "";

[
    ...times,
    ...saturdayTimes
]
    .filter(
        (x, i, a) =>
            a.indexOf(x) === i
    )
    .forEach(t => {

        select.innerHTML +=
            "<option value=\"" +
            t +
            "\">" +
            t +
            "</option>";
    });

}

function loadAdmin() {

loadTimeOptions();

loadTeachersDropdown();

loadAdminTable();

runAdminAvailabilityCheck();

}

function loadAdminTable() {

const box =
    document.getElementById(
        "adminData"
    );

const filterTeacher =
    clean(
        document
            .getElementById(
                "filterTeacher"
            )
            .value
    );

const filterDay =
    clean(
        document
            .getElementById(
                "filterDay"
            )
            .value
    );

const filtered =
    timetable.filter(x => {

        const matchT =
            filterTeacher
                ? clean(
                    x.teacher
                ) === filterTeacher
                : true;

        const matchD =
            filterDay
                ? clean(
                    x.day
                ) === filterDay
                : true;

        return matchT && matchD;
    });

let html =
    "<div class='table-scroll'>" +
    "<table>" +
    "<tr>" +
    "<th>Day</th>" +
    "<th>Class</th>" +
    "<th>Time</th>" +
    "<th>Subject</th>" +
    "<th>Teacher</th>" +
    "<th>Room</th>" +
    "<th>Actions</th>" +
    "</tr>";

filtered.forEach(x => {

    const masterIndex =
        timetable.findIndex(
            item =>
                item.id ===
                x.id
        );

    html +=
        "<tr>" +
        "<td>" +
        x.day +
        "</td>" +
        "<td>" +
        x.class +
        "</td>" +
        "<td>" +
        x.time +
        "</td>" +
        "<td>" +
        x.subject +
        "</td>" +
        "<td>" +
        (
            x.teacher ||
            "-"
        ) +
        "</td>" +
        "<td>" +
        x.room +
        "</td>" +
        "<td>" +
        "<button class='edit' onclick='editLecture(" +
        masterIndex +
        ")'>Edit</button>" +
        "<button class='delete' onclick='deleteLecture(" +
        masterIndex +
        ")'>Delete</button>" +
        "</td>" +
        "</tr>";
});

html +=
    "</table></div>";

box.innerHTML = html;

}

function checkOverlap(
day,
time,
teacher,
room,
cls,
ignoreIndex = -1
) {

const conflicts = [];

timetable.forEach(
    (item, idx) => {

        if (
            idx ===
            ignoreIndex
        ) return;

        if (
            clean(item.day) ===
                clean(day) &&
            clean(item.time) ===
                clean(time)
        ) {

            if (
                teacher &&
                item.teacher &&
                clean(
                    item.teacher
                ).toLowerCase() ===
                clean(
                    teacher
                ).toLowerCase()
            ) {

                conflicts.push(
                    "Teacher '" +
                    teacher +
                    "' is already assigned to class '" +
                    item.class +
                    "' (" +
                    item.subject +
                    ") at this time slot."
                );
            }

            if (
                clean(item.room) ===
                clean(room)
            ) {

                conflicts.push(
                    "Room '" +
                    room +
                    "' is already occupied by class '" +
                    item.class +
                    "' (" +
                    item.subject +
                    ") at this time slot."
                );
            }

            if (
                clean(item.class) ===
                clean(cls)
            ) {

                conflicts.push(
                    "Class '" +
                    cls +
                    "' already has a lecture (" +
                    item.subject +
                    ") assigned at this time slot."
                );
            }
        }
    }
);

return conflicts;

}

async function saveLecture() {

const day =
    clean(
        document
            .getElementById(
                "aDay"
            )
            .value
    );

const cls =
    clean(
        document
            .getElementById(
                "aClass"
            )
            .value
    );

const time =
    clean(
        document
            .getElementById(
                "aTime"
            )
            .value
    );

const subject =
    clean(
        document
            .getElementById(
                "aSubject"
            )
            .value
    );

const teacher =
    clean(
        document
            .getElementById(
                "aTeacher"
            )
            .value
    );

const room =
    clean(
        document
            .getElementById(
                "aRoom"
            )
            .value
    );

const editIndex =
    parseInt(
        document
            .getElementById(
                "editIndex"
            )
            .value
    );

const alertContainer =
    document.getElementById(
        "adminAlertContainer"
    );

alertContainer.innerHTML =
    "";

if (!subject) {

    alert(
        "Please enter subject name."
    );

    return;
}

const conflicts =
    checkOverlap(
        day,
        time,
        teacher,
        room,
        cls,
        editIndex
    );

if (
    conflicts.length > 0
) {

    let alertHTML =
        "<div class='alert-box'>" +
        "<b>⚠️ Lecture Overlap Detected! Action Blocked:</b>" +
        "<ul>";

    conflicts.forEach(
        err => {
            alertHTML +=
                "<li>" +
                err +
                "</li>";
        }
    );

    alertHTML +=
        "</ul></div>";

    alertContainer.innerHTML =
        alertHTML;

    return;
}

try {

    const obj = {
        day: day,
        class: cls,
        time: time,
        subject: subject,
        teacher: teacher,
        room: room
    };

    if (editIndex >= 0) {

        obj.action =
            "update";

        obj.id =
            timetable[
                editIndex
            ].id;

    } else {

        obj.action =
            "add";
    }

    await sendToAPI(
        obj
    );

    await loadDatabase();

    resetForm();

    loadAdmin();

    alert(
        "Timetable updated successfully."
    );

} catch (error) {

    console.error(
        "Save Error:",
        error
    );

    alert(
        "Error saving timetable: " +
        error.message
    );
}

}

function editLecture(index) {

const item =
    timetable[index];

if (!item) return;

document.getElementById(
    "aDay"
).value = item.day;

document.getElementById(
    "aClass"
).value = item.class;

document.getElementById(
    "aTime"
).value = item.time;

document.getElementById(
    "aSubject"
).value = item.subject;

document.getElementById(
    "aTeacher"
).value =
    item.teacher || "";

document.getElementById(
    "aRoom"
).value = item.room;

document.getElementById(
    "editIndex"
).value = index;

window.scrollTo({
    top: 0,
    behavior: "smooth"
});

}

function resetForm() {

document.getElementById(
    "aSubject"
).value = "";

document.getElementById(
    "aTeacher"
).value = "";

document.getElementById(
    "editIndex"
).value = "-1";

document.getElementById(
    "adminAlertContainer"
).innerHTML = "";

}

async function deleteLecture(
index
) {

if (
    !confirm(
        "Delete this lecture?"
    )
) {
    return;
}

try {

    const lecture =
        timetable[index];

    if (
        !lecture ||
        !lecture.id
    ) {

        throw new Error(
            "Lecture ID not found"
        );
    }

    await sendToAPI({
        action: "delete",
        id: lecture.id
    });

    await loadDatabase();

    loadAdmin();

    alert(
        "Lecture deleted successfully."
    );

} catch (error) {

    console.error(
        "Delete Error:",
        error
    );

    alert(
        "Error deleting lecture: " +
        error.message
    );
}

}

function resetTimetable() {

alert(
    "Google Sheet is now the main database. " +
    "Reset feature is disabled to prevent accidental data loss."
);

}

function setToday(id) {

const d = new Date();

const yyyy =
    d.getFullYear();

const mm =
    String(
        d.getMonth() + 1
    ).padStart(2, "0");

const dd =
    String(
        d.getDate()
    ).padStart(2, "0");

const el =
    document.getElementById(id);

if (el) {

    el.value =
        yyyy +
        "-" +
        mm +
        "-" +
        dd;
}

}

window.onload =
async function () {

    await loadDatabase();
};
