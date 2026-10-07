const dispatcherName =
    document.querySelector('#dispatcher-name');

const logoutButton =
    document.querySelector('#logout-button');

const runForm =
    document.querySelector('#run-form');

const serviceDateInput =
    document.querySelector('#service-date');

const scheduledTimeInput =
    document.querySelector('#scheduled-time');

const routeSelect =
    document.querySelector('#route');

const driverSelect =
    document.querySelector('#driver');

const vehicleSelect =
    document.querySelector('#vehicle');

const dispatcherNotes =
    document.querySelector('#dispatcher-notes');

const formMessage =
    document.querySelector('#form-message');

const boardDateInput =
    document.querySelector('#board-date');

const runsTableBody =
    document.querySelector('#runs-table-body');

const emptyMessage =
    document.querySelector('#empty-message');

const submitRunButton =
    document.querySelector('#submit-run-button');

const cancelEditButton =
    document.querySelector('#cancel-edit-button');


let editingRunId = null;

const reportMonthInput =
    document.querySelector('#report-month');

const refreshReportButton =
    document.querySelector('#refresh-report-button');

const totalCompletedRuns =
    document.querySelector('#total-completed-runs');

const driverReportBody =
    document.querySelector('#driver-report-body');

const vehicleReportBody =
    document.querySelector('#vehicle-report-body');

const driverReportEmpty =
    document.querySelector('#driver-report-empty');

const vehicleReportEmpty =
    document.querySelector('#vehicle-report-empty');

const exportCsvButton =
    document.querySelector('#export-csv-button');



function getLocalDate() {

    const now = new Date();

    const year = now.getFullYear();

    const month =
        String(now.getMonth() + 1)
            .padStart(2, '0');

    const day =
        String(now.getDate())
            .padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function getLocalMonth() {

    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(now.getMonth() + 1)
            .padStart(2, '0');

    return `${year}-${month}`;
}


async function initializePage() {

    const {
        data: { user },
        error
    } = await db.auth.getUser();


    if (error || !user) {

        window.location.href = 'index.html';

        return;
    }


    const {
        data: profile,
        error: profileError
    } = await db
        .from('profiles')
        .select('display_name, role, active')
        .eq('id', user.id)
        .single();


    if (
        profileError ||
        !profile ||
        !profile.active ||
        profile.role !== 'dispatcher'
    ) {

        window.location.href = 'index.html';

        return;
    }


    dispatcherName.textContent =
        profile.display_name;


    const today = getLocalDate();

    serviceDateInput.value = today;
    boardDateInput.value = today;

    reportMonthInput.value =
        getLocalMonth();


    await loadRoutes();
    await loadDrivers();
    await loadVehicles();
    await loadRuns();
    await loadMonthlyReport();

}



async function loadRoutes() {

    const { data, error } =
        await db
            .from('routes')
            .select(
                'id, route_code, route_name'
            )
            .eq('active', true)
            .order('route_code');


    if (error) {

        console.error(error);

        routeSelect.innerHTML =
            '<option value="">路線載入失敗</option>';

        return;
    }


    routeSelect.innerHTML =
        '<option value="">請選擇路線</option>';


    data.forEach(route => {

        const option =
            document.createElement('option');

        option.value =
            route.id;

        option.textContent =
            route.route_name
                ? `${route.route_code} — ${route.route_name}`
                : route.route_code;

        routeSelect.appendChild(option);

    });

}



async function loadDrivers() {

    const { data, error } =
        await db
            .from('profiles')
            .select(
                'id, display_name'
            )
            .eq('role', 'driver')
            .eq('active', true)
            .order('display_name');


    if (error) {

        console.error(error);

        driverSelect.innerHTML =
            '<option value="">司機資料載入失敗</option>';

        return;
    }


    driverSelect.innerHTML =
        '<option value="">請選擇司機</option>';


    data.forEach(driver => {

        const option =
            document.createElement('option');

        option.value =
            driver.id;

        option.textContent =
            driver.display_name;

        driverSelect.appendChild(option);

    });

}



async function loadVehicles() {

    const { data, error } =
        await db
            .from('vehicles')
            .select(
                'id, plate_number, label'
            )
            .eq('active', true)
            .order('plate_number');


    if (error) {

        console.error(error);

        vehicleSelect.innerHTML =
            '<option value="">車輛資料載入失敗</option>';

        return;
    }


    vehicleSelect.innerHTML =
        '<option value="">請選擇車輛</option>';


    data.forEach(vehicle => {

        const option =
            document.createElement('option');

        option.value =
            vehicle.id;

        option.textContent =
            vehicle.label
                ? `${vehicle.plate_number} — ${vehicle.label}`
                : vehicle.plate_number;

        vehicleSelect.appendChild(option);

    });

}



runForm.addEventListener(
    'submit',
    async (event) => {

        event.preventDefault();

        const {
            data: { user },
            error: userError
        } = await db.auth.getUser();


        if (userError || !user) {

            alert(
                '登入狀態已失效，請重新登入。'
            );

            window.location.href =
                'index.html';

            return;
        }


        const {
            data: currentProfile,
            error: profileError
        } = await db
            .from('profiles')
            .select('role, active')
            .eq('id', user.id)
            .single();


        if (
            profileError ||
            !currentProfile ||
            !currentProfile.active ||
            currentProfile.role !== 'dispatcher'
        ) {

            alert(
                '目前登入帳號沒有調度權限，請重新登入。'
            );

            await db.auth.signOut();

            window.location.href =
                'index.html';

            return;
        }

        formMessage.textContent =
            editingRunId
                ? '儲存變更中...'
                : '建立中...';


        const runData = {

            service_date:
                serviceDateInput.value,

            scheduled_time:
                scheduledTimeInput.value,

            route_id:
                Number(routeSelect.value),

            driver_id:
                driverSelect.value,

            vehicle_id:
                Number(vehicleSelect.value),

            dispatcher_notes:
                dispatcherNotes.value.trim()
                || null

        };


        let error;


        if (editingRunId) {

            const result =
                await db
                    .from('runs')
                    .update(runData)
                    .eq(
                        'id',
                        editingRunId
                    );

            error = result.error;

        } else {

            const result =
                await db
                    .from('runs')
                    .insert({
                        ...runData,
                        status: 'assigned'
                    });

            error = result.error;

        }


        if (error) {

            console.error(error);

            formMessage.textContent =
                error.message;

            return;
        }


        formMessage.textContent =
            editingRunId
                ? '配送趟次已成功更新。'
                : '配送趟次已成功建立。';


        boardDateInput.value =
            serviceDateInput.value;


        resetRunForm();

        await loadRuns();

    }
);

function resetRunForm() {

    editingRunId = null;

    submitRunButton.textContent =
        '新增趟次';

    cancelEditButton.hidden = true;


    serviceDateInput.value =
        boardDateInput.value
        || getLocalDate();

    scheduledTimeInput.value = '';

    routeSelect.value = '';

    driverSelect.value = '';

    vehicleSelect.value = '';

    dispatcherNotes.value = '';

}

cancelEditButton.addEventListener(
    'click',
    () => {

        resetRunForm();

        formMessage.textContent = '';

    }
);

async function loadRuns() {

    const selectedDate =
        boardDateInput.value;


    runsTableBody.innerHTML = '';

    emptyMessage.textContent =
        '載入中...';


    const { data, error } =
        await db
            .from('runs')
            .select(`
                        id,
                        service_date,
                        scheduled_time,
                        status,
                        route_id,
                        driver_id,
                        vehicle_id,
                        dispatcher_notes,

                        routes (
                            route_code,
                            route_name
                        ),

                        profiles (
                            display_name
                        ),

                        vehicles (
                            plate_number,
                            label
                        )
                    `)
            .eq(
                'service_date',
                selectedDate
            )
            .order(
                'scheduled_time',
                { ascending: true }
            );


    if (error) {

        console.error(error);

        emptyMessage.textContent =
            '無法載入配送趟次。';

        return;
    }


    if (!data.length) {

        emptyMessage.textContent =
            '此日期尚無配送趟次。';

        return;
    }


    emptyMessage.textContent = '';


    data.forEach(run => {

        const row =
            document.createElement('tr');


        const time =
            run.scheduled_time
                ? run.scheduled_time.slice(0, 5)
                : '—';


        row.innerHTML = `

    <td>
        ${time}
    </td>

    <td>
        ${run.routes?.route_code || '—'}
    </td>

    <td>
        ${run.profiles?.display_name || '—'}
    </td>

    <td>
        ${run.vehicles?.plate_number || '—'}
    </td>

    <td>
        ${formatStatus(run.status)}
    </td>

    <td class="table-actions">

        <button
            type="button"
            class="edit-run-button"
        >
            編輯
        </button>

        ${run.status !== 'cancelled'
                ? `
                    <button
                        type="button"
                        class="cancel-run-button"
                    >
                        取消趟次
                    </button>
                `
                : ''
            }

        <button
            type="button"
            class="delete-run-button"
        >
            刪除
        </button>

    </td>
`;

        const editButton =
            row.querySelector(
                '.edit-run-button'
            );


        editButton.addEventListener(
            'click',
            () => editRun(run)
        );



        const cancelButton =
            row.querySelector(
                '.cancel-run-button'
            );


        if (cancelButton) {

            cancelButton.addEventListener(
                'click',
                () => cancelRun(run)
            );

        }



        const deleteButton =
            row.querySelector(
                '.delete-run-button'
            );


        deleteButton.addEventListener(
            'click',
            () => deleteRun(run)
        );


        runsTableBody.appendChild(row);

    });

}

async function loadMonthlyReport() {

    const selectedMonth =
        reportMonthInput.value;


    if (!selectedMonth) {
        return;
    }


    const [
        yearString,
        monthString
    ] = selectedMonth.split('-');


    const year =
        Number(yearString);

    const month =
        Number(monthString);


    const startDate =
        `${yearString}-${monthString}-01`;


    let nextYear = year;

    let nextMonth = month + 1;


    if (nextMonth === 13) {

        nextMonth = 1;
        nextYear += 1;

    }


    const nextMonthString =
        String(nextMonth)
            .padStart(2, '0');


    const endDate =
        `${nextYear}-${nextMonthString}-01`;


    driverReportBody.innerHTML = '';

    vehicleReportBody.innerHTML = '';

    driverReportEmpty.textContent =
        '載入中...';

    vehicleReportEmpty.textContent =
        '載入中...';


    const { data, error } =
        await db
            .from('runs')
            .select(`
                id,
                status,

                profiles (
                    id,
                    display_name
                ),

                vehicles (
                    id,
                    plate_number,
                    label
                )
            `)
            .eq(
                'status',
                'completed'
            )
            .gte(
                'service_date',
                startDate
            )
            .lt(
                'service_date',
                endDate
            );


    if (error) {

        console.error(error);

        driverReportEmpty.textContent =
            '無法載入統計資料。';

        vehicleReportEmpty.textContent =
            '無法載入統計資料。';

        return;
    }


    totalCompletedRuns.textContent =
        data.length;


    const driverTotals = {};

    const vehicleTotals = {};


    data.forEach(run => {

        const driverName =
            run.profiles?.display_name
            || 'Unknown Driver';


        driverTotals[driverName] =
            (driverTotals[driverName] || 0)
            + 1;


        const vehicleName =
            run.vehicles?.plate_number
            || 'Unknown Vehicle';


        vehicleTotals[vehicleName] =
            (vehicleTotals[vehicleName] || 0)
            + 1;

    });


    renderDriverReport(driverTotals);

    renderVehicleReport(vehicleTotals);

}

function renderDriverReport(totals) {

    driverReportBody.innerHTML = '';

    const entries =
        Object.entries(totals);


    entries.sort(
        (a, b) => b[1] - a[1]
    );


    if (!entries.length) {

        driverReportEmpty.textContent =
            '本月尚無已完成的配送趟次。';

        return;
    }


    driverReportEmpty.textContent = '';


    entries.forEach(
        ([driverName, count]) => {

            const row =
                document.createElement('tr');


            row.innerHTML = `
                <td>
                    ${driverName}
                </td>

                <td>
                    ${count}
                </td>
            `;


            driverReportBody.appendChild(
                row
            );

        }
    );

}

function renderVehicleReport(totals) {

    vehicleReportBody.innerHTML = '';

    const entries =
        Object.entries(totals);


    entries.sort(
        (a, b) => b[1] - a[1]
    );


    if (!entries.length) {

        vehicleReportEmpty.textContent =
            '本月尚無已完成的配送趟次。';

        return;
    }


    vehicleReportEmpty.textContent = '';


    entries.forEach(
        ([plateNumber, count]) => {

            const row =
                document.createElement('tr');


            row.innerHTML = `
                <td>
                    ${plateNumber}
                </td>

                <td>
                    ${count}
                </td>
            `;


            vehicleReportBody.appendChild(
                row
            );

        }
    );

}

function editRun(run) {

    editingRunId =
        run.id;


    serviceDateInput.value =
        run.service_date;

    scheduledTimeInput.value =
        run.scheduled_time
            ? run.scheduled_time.slice(0, 5)
            : '';

    routeSelect.value =
        String(run.route_id);

    driverSelect.value =
        run.driver_id;

    vehicleSelect.value =
        String(run.vehicle_id);

    dispatcherNotes.value =
        run.dispatcher_notes || '';


    submitRunButton.textContent =
        '儲存變更';

    cancelEditButton.hidden =
        false;


    formMessage.textContent =
        `正在編輯趟次 #${run.id}`;


    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });

}

async function cancelRun(run) {

    const confirmed =
        confirm(
            `確定要取消 ${run.profiles?.display_name || '此司機'} 的這筆配送趟次嗎？`
        );


    if (!confirmed) {
        return;
    }


    const { error } =
        await db
            .from('runs')
            .update({
                status: 'cancelled'
            })
            .eq(
                'id',
                run.id
            );


    if (error) {

        console.error(error);

        alert(
            `無法取消趟次: ${error.message}`
        );

        return;
    }


    await loadRuns();

}

async function deleteRun(run) {

    const confirmed =
        confirm(
            '確定要永久刪除這筆趟次嗎？刪除後無法復原。'
        );


    if (!confirmed) {
        return;
    }


    const { error } =
        await db
            .from('runs')
            .delete()
            .eq(
                'id',
                run.id
            );


    if (error) {

        console.error(error);

        alert(
            `無法刪除趟次: ${error.message}`
        );

        return;
    }


    await loadRuns();

}


function formatStatus(status) {

    switch (status) {

        case 'assigned':
            return '已指派';

        case 'in_progress':
            return '配送中';

        case 'completed':
            return '已完成';

        case 'cancelled':
            return '已取消';

        default:
            return status;

    }

}

function getMonthRange(monthValue) {

    const [
        yearString,
        monthString
    ] = monthValue.split('-');


    const year =
        Number(yearString);

    const month =
        Number(monthString);


    const startDate =
        `${yearString}-${monthString}-01`;


    let nextYear =
        year;

    let nextMonth =
        month + 1;


    if (nextMonth === 13) {

        nextMonth = 1;
        nextYear += 1;

    }


    const nextMonthString =
        String(nextMonth)
            .padStart(2, '0');


    const endDate =
        `${nextYear}-${nextMonthString}-01`;


    return {
        startDate,
        endDate
    };

}

async function exportMonthlyCsv() {

    const selectedMonth =
        reportMonthInput.value;


    if (!selectedMonth) {

        alert(
            '請先選擇月份。'
        );

        return;
    }


    const {
        startDate,
        endDate
    } = getMonthRange(
        selectedMonth
    );


    exportCsvButton.disabled = true;

    exportCsvButton.textContent =
        '匯出中...';


    const { data, error } =
        await db
            .from('runs')
            .select(`
                id,
                service_date,
                scheduled_time,
                status,
                actual_start_time,
                actual_end_time,
                driver_notes,
                dispatcher_notes,

                profiles (
                    display_name
                ),

                routes (
                    route_code,
                    route_name
                ),

                vehicles (
                    plate_number,
                    label
                )
            `)
            .eq(
                'status',
                'completed'
            )
            .gte(
                'service_date',
                startDate
            )
            .lt(
                'service_date',
                endDate
            )
            .order(
                'service_date',
                { ascending: true }
            )
            .order(
                'scheduled_time',
                { ascending: true }
            );


    exportCsvButton.disabled =
        false;

    exportCsvButton.textContent =
        '匯出 CSV';


    if (error) {

        console.error(error);

        alert(
            `無法匯出 CSV: ${error.message}`
        );

        return;
    }


    if (!data.length) {

        alert(
            '此月份沒有已完成的配送趟次。'
        );

        return;
    }


    const rows = data.map(run => {

        return [

            run.service_date,

            run.scheduled_time
                ? run.scheduled_time.slice(0, 5)
                : '',

            run.profiles?.display_name
            || '',

            run.vehicles?.plate_number
            || '',

            run.routes?.route_code
            || '',

            run.routes?.route_name
            || '',

            run.status,

            formatCsvDateTime(
                run.actual_start_time
            ),

            formatCsvDateTime(
                run.actual_end_time
            ),

            run.driver_notes
            || '',

            run.dispatcher_notes
            || ''

        ];

    });


    const headers = [

        '配送日期',
        '預計出發時間',
        '司機',
        '車牌號碼',
        '路線代碼',
        '路線名稱',
        '狀態',
        '實際開始時間',
        '實際完成時間',
        '司機備註',
        '調度備註'

    ];


    const csvContent =
        [
            headers,
            ...rows
        ]
            .map(row =>
                row
                    .map(escapeCsvValue)
                    .join(',')
            )
            .join('\n');


    downloadCsv(
        csvContent,
        `配送趟次月報-${selectedMonth}.csv`
    );

}

function escapeCsvValue(value) {

    const stringValue =
        String(value ?? '');


    const escaped =
        stringValue.replace(
            /"/g,
            '""'
        );


    return `"${escaped}"`;

}

function formatCsvDateTime(value) {

    if (!value) {
        return '';
    }


    const date =
        new Date(value);


    return date.toLocaleString();

}

function downloadCsv(
    csvContent,
    filename
) {

    const bom =
        '\uFEFF';


    const blob =
        new Blob(
            [
                bom + csvContent
            ],
            {
                type:
                    'text/csv;charset=utf-8;'
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement('a');


    link.href =
        url;

    link.download =
        filename;


    document.body.appendChild(
        link
    );


    link.click();


    document.body.removeChild(
        link
    );


    URL.revokeObjectURL(
        url
    );

}


boardDateInput.addEventListener(
    'change',
    loadRuns
);

reportMonthInput.addEventListener(
    'change',
    loadMonthlyReport
);

refreshReportButton.addEventListener(
    'click',
    loadMonthlyReport
);



logoutButton.addEventListener(
    'click',
    async () => {

        await db.auth.signOut();

        window.location.href =
            'index.html';

    }
);

exportCsvButton.addEventListener(
    'click',
    exportMonthlyCsv
);



initializePage();