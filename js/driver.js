const driverName =
    document.querySelector('#driver-name');

const driverDateInput =
    document.querySelector('#driver-date');

const driverRuns =
    document.querySelector('#driver-runs');

const logoutButton =
    document.querySelector('#logout-button');


let currentUser = null;



function getLocalDate() {

    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(now.getMonth() + 1)
            .padStart(2, '0');

    const day =
        String(now.getDate())
            .padStart(2, '0');

    return `${year}-${month}-${day}`;
}



async function initializeDriverPage() {

    const {
        data: { user },
        error
    } = await db.auth.getUser();


    if (error || !user) {

        window.location.href =
            'index.html';

        return;
    }


    currentUser = user;


    const {
        data: profile,
        error: profileError
    } = await db
        .from('profiles')
        .select(
            'display_name, role, active'
        )
        .eq('id', user.id)
        .single();


    if (
        profileError ||
        !profile ||
        !profile.active ||
        profile.role !== 'driver'
    ) {

        await db.auth.signOut();

        window.location.href =
            'index.html';

        return;
    }


    driverName.textContent =
        profile.display_name;


    driverDateInput.value =
        getLocalDate();


    await loadDriverRuns();

}



async function loadDriverRuns() {

    driverRuns.innerHTML =
        '<p>載入中...</p>';


    const selectedDate =
        driverDateInput.value;


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
                'service_date',
                selectedDate
            )
            .order(
                'scheduled_time',
                { ascending: true }
            );


    if (error) {

        console.error(error);

        driverRuns.innerHTML =
            '<p>無法載入配送趟次。</p>';

        return;
    }


    if (!data.length) {

        driverRuns.innerHTML =
            '<p>此日期沒有指派給你的配送趟次。</p>';

        return;
    }


    driverRuns.innerHTML = '';


    data.forEach(run => {

        const card =
            createRunCard(run);

        driverRuns.appendChild(card);

    });

}



function createRunCard(run) {

    const card =
        document.createElement('article');

    card.className =
        'run-card';


    const scheduledTime =
        run.scheduled_time
            ? run.scheduled_time.slice(0, 5)
            : '—';


    const routeName =
        run.routes?.route_name
        || run.routes?.route_code
        || '—';


    const vehicle =
        run.vehicles?.label
            ? `${run.vehicles.plate_number} — ${run.vehicles.label}`
            : run.vehicles?.plate_number || '—';


    card.innerHTML = `

        <div class="run-card-header">

            <div>

                <span class="run-time">
                    ${scheduledTime}
                </span>

                <h3>
                    ${routeName}
                </h3>

            </div>

            <span class="status-badge">
                ${formatStatus(run.status)}
            </span>

        </div>


        <div class="run-details">

            <p>
                <strong>車輛:</strong>
                ${vehicle}
            </p>


            ${run.dispatcher_notes
            ? `
                        <p>
                            <strong>
                                調度備註:
                            </strong>

                            ${run.dispatcher_notes}
                        </p>
                    `
            : ''
        }


            ${run.actual_start_time
            ? `
                        <p>
                            <strong>
                                開始時間:
                            </strong>

                            ${formatDateTime(
                run.actual_start_time
            )}
                        </p>
                    `
            : ''
        }


            ${run.actual_end_time
            ? `
                        <p>
                            <strong>
                                完成時間:
                            </strong>

                            ${formatDateTime(
                run.actual_end_time
            )}
                        </p>
                    `
            : ''
        }

        </div>


        <div
            class="run-actions"
            id="actions-${run.id}"
        >
        </div>

    `;


    const actionArea =
        card.querySelector(
            `#actions-${run.id}`
        );


    renderActions(
        run,
        actionArea
    );


    return card;

}



function renderActions(
    run,
    container
) {

    container.innerHTML = '';


    if (run.status === 'assigned') {

        const startButton =
            document.createElement('button');

        startButton.textContent =
            '開始配送';

        startButton.addEventListener(
            'click',
            () => startRun(run.id)
        );

        container.appendChild(
            startButton
        );

    }


    if (run.status === 'in_progress') {

        const label =
            document.createElement('label');

        label.textContent =
            '司機備註';


        const textarea =
            document.createElement(
                'textarea'
            );

        textarea.rows = 3;

        textarea.placeholder =
            '如有特殊狀況可填寫備註...';

        textarea.value =
            run.driver_notes || '';


        const completeButton =
            document.createElement(
                'button'
            );

        completeButton.textContent =
            '完成配送';


        completeButton.addEventListener(
            'click',
            () => completeRun(
                run.id,
                textarea.value
            )
        );


        container.appendChild(label);

        container.appendChild(
            textarea
        );

        container.appendChild(
            completeButton
        );

    }


    if (run.status === 'completed') {

        const message =
            document.createElement('p');

        message.className =
            'completed-message';

        message.textContent =
            '此趟配送已完成。';

        container.appendChild(
            message
        );


        if (run.driver_notes) {

            const notes =
                document.createElement('p');

            notes.innerHTML = `
                <strong>
                    司機備註:
                </strong>

                ${run.driver_notes}
            `;

            container.appendChild(
                notes
            );

        }

    }


    if (run.status === 'cancelled') {

        const message =
            document.createElement('p');

        message.textContent =
            '此趟配送已取消。';

        container.appendChild(
            message
        );

    }

}



async function startRun(runId) {

    const confirmed =
        confirm(
            '確定要開始這趟配送嗎？'
        );


    if (!confirmed) {
        return;
    }


    const { error } =
        await db
            .from('runs')
            .update({

                status:
                    'in_progress',

                actual_start_time:
                    new Date().toISOString()

            })
            .eq('id', runId);


    if (error) {

        console.error(error);

        alert(
            `無法開始配送: ${error.message}`
        );

        return;
    }


    await loadDriverRuns();

}



async function completeRun(
    runId,
    notes
) {

    const confirmed =
        confirm(
            '確定要將這趟配送標記為完成嗎？'
        );


    if (!confirmed) {
        return;
    }


    const { error } =
        await db
            .from('runs')
            .update({

                status:
                    'completed',

                actual_end_time:
                    new Date().toISOString(),

                driver_notes:
                    notes.trim() || null

            })
            .eq('id', runId);


    if (error) {

        console.error(error);

        alert(
            `無法完成配送: ${error.message}`
        );

        return;
    }


    await loadDriverRuns();

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



function formatDateTime(value) {

    const date =
        new Date(value);


    return date.toLocaleString(
        undefined,
        {
            hour: '2-digit',
            minute: '2-digit'
        }
    );

}



driverDateInput.addEventListener(
    'change',
    loadDriverRuns
);



logoutButton.addEventListener(
    'click',
    async () => {

        await db.auth.signOut();

        window.location.href =
            'index.html';

    }
);



initializeDriverPage();