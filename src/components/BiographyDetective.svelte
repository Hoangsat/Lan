<script>
  export let person;
  export let events;
  export let filters;
  export let stages;
  export let interviewNotes = [];

  const colorMeta = {
    red: {
      label: "Tổn thất",
      mark: "!",
      className: "tone-red"
    },
    green: {
      label: "Thích nghi",
      mark: "+",
      className: "tone-green"
    },
    yellow: {
      label: "Quyết định",
      mark: "?",
      className: "tone-yellow"
    }
  };

  const typeLabels = {
    cause_of_immigration: "Nguyên nhân",
    loss: "Mất mát",
    achievement: "Thành tựu",
    decision: "Quyết định"
  };

  let mode = "timeline";
  let activeId = events[0]?.id;
  let selectedFilter = "all";
  let hoveredId = null;
  let draggingId = null;
  let svgElement;
  let cardExpanded = false;
  let cluePulse = false;
  let nodePositions = Object.fromEntries(events.map((event) => [event.id, { ...event.map }]));

  $: filteredEvents =
    selectedFilter === "all"
      ? events
      : events.filter((event) => event.type.includes(selectedFilter));

  $: if (filteredEvents.length && !filteredEvents.some((event) => event.id === activeId)) {
    activeId = filteredEvents[0].id;
  }

  $: activeEvent = events.find((event) => event.id === activeId) ?? filteredEvents[0] ?? events[0];
  $: activeStageIndex = Math.max(0, stages.findIndex((stage) => stage.id === activeEvent?.stage));
  $: visibleEventIds = new Set(filteredEvents.map((event) => event.id));
  $: visibleEdges = filteredEvents.flatMap((event) =>
    event.linked_events
      .filter((targetId) => visibleEventIds.has(targetId))
      .map((targetId) => ({
        source: event.id,
        target: targetId
      }))
  );

  function selectEvent(id) {
    activeId = id;
    cardExpanded = true;
  }

  function setMode(nextMode) {
    mode = nextMode;
    cardExpanded = false;
  }

  function firstCause(event) {
    return event?.causes?.[0] ?? "Chưa có ghi chú";
  }

  function tagsFor(event) {
    return event.type.map((type) => typeLabels[type]).filter(Boolean);
  }

  function nodeLabel(event) {
    return event.shortTitle ?? event.title;
  }

  function nodePoint(id) {
    return nodePositions[id] ?? { x: 0, y: 0 };
  }

  function svgPointFromPointer(pointerEvent) {
    if (!svgElement) {
      return null;
    }

    const point = svgElement.createSVGPoint();
    point.x = pointerEvent.clientX;
    point.y = pointerEvent.clientY;
    return point.matrixTransform(svgElement.getScreenCTM().inverse());
  }

  function updateDraggedPosition(pointerEvent) {
    if (!draggingId) {
      return;
    }

    const point = svgPointFromPointer(pointerEvent);
    if (!point) {
      return;
    }

    nodePositions = {
      ...nodePositions,
      [draggingId]: {
        x: Math.min(830, Math.max(70, point.x)),
        y: Math.min(450, Math.max(70, point.y))
      }
    };
  }

  function startDrag(pointerEvent, id) {
    draggingId = id;
    activeId = id;
    hoveredId = id;
    pointerEvent.currentTarget.setPointerCapture?.(pointerEvent.pointerId);
    updateDraggedPosition(pointerEvent);
  }

  function stopDrag() {
    draggingId = null;
  }

  function isPathHighlighted(edge) {
    return hoveredId === edge.source || hoveredId === edge.target || activeId === edge.source || activeId === edge.target;
  }

  function isNodeDimmed(id) {
    if (!hoveredId) {
      return false;
    }

    return (
      id !== hoveredId &&
      !visibleEdges.some(
        (edge) => (edge.source === hoveredId && edge.target === id) || (edge.target === hoveredId && edge.source === id)
      )
    );
  }

  function showRandomClue() {
    if (!filteredEvents.length) {
      return;
    }

    const randomEvent = filteredEvents[Math.floor(Math.random() * filteredEvents.length)];
    activeId = randomEvent.id;
    cardExpanded = true;
    cluePulse = false;
    requestAnimationFrame(() => {
      cluePulse = true;
      window.setTimeout(() => {
        cluePulse = false;
      }, 900);
    });
  }
</script>

<main class="case-shell">
  <header class="case-header" aria-labelledby="page-title">
    <div class="case-copy">
      <p class="eyebrow">Lời khai {person.caseNumber}</p>
      <h1 id="page-title">{person.title}</h1>
      <p class="lead">{person.summary}</p>
      <dl class="person-facts" aria-label="Thông tin nhân vật">
        <div>
          <dt>Nhân vật</dt>
          <dd>{person.name}</dd>
        </div>
        <div>
          <dt>Cha</dt>
          <dd>{person.father}</dd>
        </div>
        <div>
          <dt>Mẹ</dt>
          <dd>{person.mother}</dd>
        </div>
        <div>
          <dt>Hành trình</dt>
          <dd>{person.route}</dd>
        </div>
        <div>
          <dt>Tuổi hiện tại</dt>
          <dd>{person.age}</dd>
        </div>
      </dl>
    </div>
    <figure class="case-visual">
      <img src="/evidence-board.svg" alt="Bảng tóm tắt hành trình với giấy tờ, mốc thời gian và đường nối nguyên nhân hệ quả" />
    </figure>
  </header>

  <section class="control-band" aria-label="Bảng điều khiển chuẩn bị phỏng vấn">
    <div class="mode-switch" role="tablist" aria-label="Chọn chế độ xem">
      <button
        type="button"
        role="tab"
        aria-selected={mode === "timeline"}
        class:active={mode === "timeline"}
        on:click={() => setMode("timeline")}
      >
        Dòng thời gian
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "map"}
        class:active={mode === "map"}
        on:click={() => setMode("map")}
      >
        Bản đồ liên kết
      </button>
    </div>

    <div class="filters" aria-label="Bộ lọc nội dung">
      {#each filters as filter}
        <button
          type="button"
          class:active={selectedFilter === filter.id}
          aria-pressed={selectedFilter === filter.id}
          on:click={() => {
            selectedFilter = filter.id;
            cardExpanded = false;
          }}
        >
          {filter.shortLabel}
        </button>
      {/each}
    </div>

    <button type="button" class="clue-button" on:click={showRandomClue}>Câu hỏi ngẫu nhiên</button>
  </section>

  <section class="journey" aria-label="Tiến trình nhập cư">
    <div class="journey-track">
      {#each stages as stage, index}
        <div
          class:current={index === activeStageIndex}
          class:complete={index < activeStageIndex}
          class="journey-step"
          aria-current={index === activeStageIndex ? "step" : undefined}
        >
          <span class="step-index">{index + 1}</span>
          <span>{stage.label}</span>
        </div>
      {/each}
    </div>
  </section>

  {#if mode === "timeline"}
    <section class="timeline-layout" aria-label="Chế độ dòng thời gian chuẩn bị phỏng vấn">
      <aside class="timeline-panel">
        <div class="section-heading">
          <p>Các mốc cần nhớ</p>
          <strong>{filteredEvents.length} mốc</strong>
        </div>

        {#if filteredEvents.length}
          <ol class="timeline-list">
            {#each filteredEvents as event}
              <li>
                <button
                  type="button"
                  class="timeline-item"
                  class:active={activeId === event.id}
                  class:pulse={cluePulse && activeId === event.id}
                  data-color={event.color}
                  aria-describedby={`tip-${event.id}`}
                  on:click={() => selectEvent(event.id)}
                >
                  <span class="event-marker" aria-hidden="true">{colorMeta[event.color].mark}</span>
                  <span class="event-body">
                    <span class="event-date">{event.date}</span>
                    <span class="event-title">{event.title}</span>
                    <span class="event-description">{event.description}</span>
                    <span class="event-tags">
                      {#each tagsFor(event) as tag}
                        <span>{tag}</span>
                      {/each}
                    </span>
                  </span>
                  <span class="event-tooltip" id={`tip-${event.id}`} role="tooltip">Vì: {firstCause(event)}</span>
                </button>
              </li>
            {/each}
          </ol>
        {:else}
          <p class="empty-state">Không có mốc nào khớp với bộ lọc hiện tại.</p>
        {/if}
      </aside>

      <article
        class="detail-card"
        class:mobile-open={cardExpanded}
        class:pulse={cluePulse}
        aria-live="polite"
      >
        {#if activeEvent}
          <button type="button" class="mobile-back" on:click={() => (cardExpanded = false)}>Quay lại</button>
          <div class="detail-kicker">
            <span class={`tone-chip ${colorMeta[activeEvent.color].className}`}>
              <span aria-hidden="true">{colorMeta[activeEvent.color].mark}</span>
              {colorMeta[activeEvent.color].label}
            </span>
            <span>{activeEvent.date}</span>
          </div>
          <h2>{activeEvent.title}</h2>
          <p class="detail-description">{activeEvent.description}</p>

          <div class="detail-grid">
            <section>
              <h3>Nguyên nhân</h3>
              <ul>
                {#each activeEvent.causes as cause}
                  <li>{cause}</li>
                {/each}
              </ul>
            </section>

            <section>
              <h3>Hệ quả</h3>
              <ul>
                {#each activeEvent.consequences as consequence}
                  <li>{consequence}</li>
                {/each}
              </ul>
            </section>

            <section class="wide">
              <h3>Bối cảnh</h3>
              <p>{activeEvent.context}</p>
            </section>

            <section>
              <h3>Cảm xúc</h3>
              <p>{activeEvent.emotion}</p>
            </section>
          </div>
        {/if}
      </article>
    </section>
  {:else}
    <section class="map-layout" aria-label="Chế độ bản đồ liên kết">
      <div class="map-toolbar">
        <div>
          <p class="section-label">Sơ đồ nguyên nhân → hệ quả</p>
          <h2>Kéo các nút để tự ôn lại trình tự câu chuyện</h2>
        </div>
        <button type="button" on:click={() => setMode("timeline")}>Trở về dòng thời gian</button>
      </div>

      <div class="graph-shell">
        <svg
          bind:this={svgElement}
          class="graph"
          viewBox="0 0 900 520"
          role="img"
          aria-label="Bản đồ các mốc đời được nối bằng mũi tên nguyên nhân hệ quả"
          on:pointermove={updateDraggedPosition}
          on:pointerup={stopDrag}
          on:pointerleave={() => {
            stopDrag();
            hoveredId = null;
          }}
        >
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#24332d" />
            </marker>
          </defs>

          {#each visibleEdges as edge}
            {@const source = nodePoint(edge.source)}
            {@const target = nodePoint(edge.target)}
            <line
              class="edge"
              class:highlight={isPathHighlighted(edge)}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              marker-end="url(#arrow)"
            />
          {/each}

          {#each filteredEvents as event}
            {@const point = nodePoint(event.id)}
            <g
              class="graph-node"
              class:active={activeId === event.id}
              class:dimmed={isNodeDimmed(event.id)}
              data-color={event.color}
              transform={`translate(${point.x}, ${point.y})`}
              role="button"
              tabindex="0"
              aria-label={`${event.date}: ${event.title}. ${firstCause(event)}`}
              on:pointerdown={(pointerEvent) => startDrag(pointerEvent, event.id)}
              on:pointerenter={() => (hoveredId = event.id)}
              on:pointerleave={() => (hoveredId = null)}
              on:keydown={(keyboardEvent) => {
                if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                  keyboardEvent.preventDefault();
                  selectEvent(event.id);
                }
              }}
            >
              <circle r="48" />
              <text class="node-date" text-anchor="middle" y="-8">{event.date}</text>
              <text class="node-title" text-anchor="middle" y="14">{nodeLabel(event)}</text>
            </g>
          {/each}
        </svg>
      </div>

      <aside class="map-summary">
        <span class={`tone-chip ${colorMeta[activeEvent.color].className}`}>
          <span aria-hidden="true">{colorMeta[activeEvent.color].mark}</span>
          {colorMeta[activeEvent.color].label}
        </span>
        <h3>{activeEvent.date}: {activeEvent.title}</h3>
        <p>{activeEvent.description}</p>
        <p><strong>Điểm cần nhớ:</strong> {firstCause(activeEvent)}</p>
      </aside>
    </section>
  {/if}

  {#if interviewNotes.length}
    <section class="prep-notes" aria-labelledby="prep-title">
      <div class="prep-heading">
        <p class="section-label">Chuẩn bị phỏng vấn sâu</p>
        <h2 id="prep-title">Chi tiết Lan có thể đọc lại trước khi trả lời</h2>
        <p>
          Chỉ dùng những chi tiết đúng với ký ức thật. Nếu không chắc, Lan nên nói “cháu không nhớ rõ”
          hoặc “cháu không chắc”, thay vì cố trả lời chính xác.
        </p>
      </div>

      <div class="prep-grid">
        {#each interviewNotes as section}
          <article class="prep-card">
            <div class="prep-card-heading">
              <span>{section.id}</span>
              <h3>{section.title}</h3>
            </div>
            {#if section.summary}
              <p class="prep-summary">{section.summary}</p>
            {/if}

            <ul>
              {#each section.points as point}
                <li>
                  <strong>{point.label}</strong>
                  <span>{point.text}</span>
                </li>
              {/each}
            </ul>
          </article>
        {/each}
      </div>
    </section>
  {/if}
</main>

<style>
  .case-shell {
    width: min(1180px, calc(100% - 32px));
    margin: 0 auto;
    padding: 28px 0 40px;
  }

  .case-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    align-items: stretch;
    gap: 28px;
    min-height: 260px;
    padding: 28px;
    border: 1px solid #d8ded8;
    background: rgba(255, 255, 255, 0.86);
    box-shadow: 0 20px 70px rgba(18, 24, 22, 0.08);
  }

  .case-copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    justify-content: center;
  }

  .eyebrow,
  .section-label {
    margin: 0 0 10px;
    color: #4d5b55;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h1,
  h2,
  h3,
  p {
    overflow-wrap: anywhere;
  }

  h1 {
    max-width: 760px;
    margin: 0;
    color: #121816;
    font-size: clamp(2.2rem, 5vw, 4.8rem);
    line-height: 0.98;
    letter-spacing: 0;
  }

  .lead {
    max-width: 760px;
    margin: 20px 0 0;
    color: #26352f;
    font-size: 1.08rem;
    line-height: 1.65;
  }

  .person-facts {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;
    margin: 24px 0 0;
  }

  .person-facts div {
    min-width: 0;
    border-left: 4px solid #d49a16;
    padding-left: 12px;
  }

  .person-facts dt {
    color: #5a665f;
    font-size: 0.78rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .person-facts dd {
    margin: 4px 0 0;
    color: #121816;
    font-weight: 800;
  }

  .case-visual {
    margin: 0;
    border: 1px solid #cbd4cc;
    background: #f8faf7;
    overflow: hidden;
  }

  .case-visual img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .control-band,
  .journey,
  .timeline-layout,
  .map-layout,
  .prep-notes {
    margin-top: 18px;
    border: 1px solid #d8ded8;
    background: rgba(255, 255, 255, 0.9);
  }

  .control-band {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 14px;
    align-items: center;
    padding: 16px;
  }

  .mode-switch,
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .mode-switch {
    padding: 4px;
    border: 1px solid #cbd4cc;
    background: #f2f5f1;
  }

  .mode-switch button,
  .filters button,
  .clue-button,
  .map-toolbar button,
  .mobile-back {
    min-height: 42px;
    border: 1px solid #b9c4bc;
    border-radius: 6px;
    background: #ffffff;
    color: #121816;
    font-weight: 800;
  }

  .mode-switch button {
    border-color: transparent;
    padding: 0 14px;
  }

  .filters button,
  .clue-button,
  .map-toolbar button,
  .mobile-back {
    padding: 0 14px;
  }

  .mode-switch button.active,
  .filters button.active {
    border-color: #121816;
    background: #121816;
    color: #ffffff;
  }

  .clue-button {
    border-color: #d49a16;
    background: #fff7df;
  }

  .journey {
    padding: 18px;
  }

  .journey-track {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;
  }

  .journey-step {
    position: relative;
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 8px;
    min-height: 48px;
    padding: 8px 10px;
    border: 1px solid #cbd4cc;
    color: #46544e;
    background: #f8faf7;
    font-weight: 800;
  }

  .journey-step.complete {
    border-color: #24775b;
    background: #e8f4ee;
    color: #144936;
  }

  .journey-step.current {
    border-color: #121816;
    background: #121816;
    color: #ffffff;
  }

  .step-index {
    display: inline-grid;
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
    place-items: center;
    border-radius: 50%;
    background: currentColor;
    color: #ffffff;
    font-size: 0.8rem;
  }

  .journey-step.current .step-index {
    background: #ffffff;
    color: #121816;
  }

  .timeline-layout {
    display: grid;
    grid-template-columns: minmax(280px, 410px) minmax(0, 1fr);
    min-height: 560px;
  }

  .timeline-panel {
    border-right: 1px solid #d8ded8;
    padding: 20px;
  }

  .section-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  .section-heading p,
  .section-heading strong {
    margin: 0;
  }

  .section-heading p {
    color: #4d5b55;
    font-size: 0.82rem;
    font-weight: 900;
    text-transform: uppercase;
  }

  .timeline-list {
    display: grid;
    gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .timeline-item {
    position: relative;
    display: grid;
    width: 100%;
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 12px;
    min-height: 116px;
    border: 1px solid #cbd4cc;
    border-radius: 8px;
    padding: 14px;
    background: #ffffff;
    color: #121816;
    text-align: left;
    transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
  }

  .timeline-item:hover,
  .timeline-item:focus-visible,
  .timeline-item.active {
    border-color: #121816;
    box-shadow: 0 16px 40px rgba(18, 24, 22, 0.12);
    transform: translateY(-1px);
  }

  .timeline-item[data-color="red"] {
    --event-color: #b9363d;
  }

  .timeline-item[data-color="green"] {
    --event-color: #24775b;
  }

  .timeline-item[data-color="yellow"] {
    --event-color: #d49a16;
  }

  .event-marker {
    display: grid;
    width: 40px;
    height: 40px;
    place-items: center;
    border-radius: 50%;
    background: var(--event-color);
    color: #ffffff;
    font-weight: 900;
  }

  .event-body {
    min-width: 0;
  }

  .event-date {
    display: block;
    color: #4d5b55;
    font-size: 0.82rem;
    font-weight: 900;
  }

  .event-title {
    display: block;
    margin-top: 3px;
    color: #121816;
    font-size: 1rem;
    font-weight: 900;
    line-height: 1.25;
  }

  .event-description {
    display: block;
    margin-top: 7px;
    color: #4a5751;
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .event-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }

  .event-tags span {
    border: 1px solid #d8ded8;
    border-radius: 999px;
    padding: 3px 8px;
    color: #26352f;
    background: #f4f6f2;
    font-size: 0.75rem;
    font-weight: 800;
  }

  .event-tooltip {
    position: absolute;
    z-index: 3;
    right: 14px;
    bottom: calc(100% - 4px);
    width: min(260px, calc(100vw - 40px));
    border: 1px solid #121816;
    border-radius: 6px;
    padding: 10px 12px;
    background: #121816;
    color: #ffffff;
    font-size: 0.85rem;
    line-height: 1.4;
    opacity: 0;
    pointer-events: none;
    transform: translateY(6px);
    transition: opacity 140ms ease, transform 140ms ease;
  }

  .timeline-item:hover .event-tooltip,
  .timeline-item:focus-visible .event-tooltip {
    opacity: 1;
    transform: translateY(0);
  }

  .detail-card {
    min-width: 0;
    padding: 28px;
    background:
      linear-gradient(180deg, rgba(212, 154, 22, 0.08), transparent 220px),
      #ffffff;
  }

  .detail-kicker,
  .map-summary .tone-chip {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    color: #4d5b55;
    font-size: 0.85rem;
    font-weight: 900;
  }

  .tone-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 999px;
    padding: 7px 11px;
    color: #121816;
    font-weight: 900;
  }

  .tone-chip span {
    display: inline-grid;
    width: 22px;
    height: 22px;
    place-items: center;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.8);
  }

  .tone-red {
    background: #f6dfe1;
    border: 1px solid #b9363d;
  }

  .tone-green {
    background: #dff2e9;
    border: 1px solid #24775b;
  }

  .tone-yellow {
    background: #fff2c5;
    border: 1px solid #d49a16;
  }

  .detail-card h2 {
    max-width: 760px;
    margin: 18px 0 0;
    color: #121816;
    font-size: clamp(1.75rem, 3.4vw, 3.2rem);
    line-height: 1.05;
    letter-spacing: 0;
  }

  .detail-description {
    max-width: 780px;
    margin: 14px 0 0;
    color: #2b3933;
    font-size: 1.04rem;
    line-height: 1.65;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin-top: 24px;
  }

  .detail-grid section {
    border-top: 4px solid #121816;
    padding: 14px 0 4px;
  }

  .detail-grid .wide {
    grid-column: 1 / -1;
  }

  .detail-grid h3 {
    margin: 0 0 10px;
    color: #4d5b55;
    font-size: 0.82rem;
    font-weight: 900;
    text-transform: uppercase;
  }

  .detail-grid p,
  .detail-grid ul {
    margin: 0;
    color: #17211c;
    line-height: 1.6;
  }

  .detail-grid ul {
    padding-left: 20px;
  }

  .mobile-back {
    display: none;
    margin-bottom: 18px;
  }

  .empty-state {
    border: 1px dashed #aab6ad;
    padding: 16px;
    color: #4d5b55;
    line-height: 1.5;
  }

  .map-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 0;
  }

  .map-toolbar {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    border-bottom: 1px solid #d8ded8;
    padding: 18px 20px;
  }

  .map-toolbar h2 {
    margin: 0;
    font-size: 1.4rem;
    letter-spacing: 0;
  }

  .graph-shell {
    min-width: 0;
    min-height: 560px;
    padding: 18px;
    background:
      linear-gradient(#e1e7e1 1px, transparent 1px),
      linear-gradient(90deg, #e1e7e1 1px, transparent 1px),
      #f8faf7;
    background-size: 44px 44px;
  }

  .graph {
    width: 100%;
    height: 100%;
    min-height: 520px;
    touch-action: none;
  }

  .edge {
    stroke: #74827a;
    stroke-width: 3;
    opacity: 0.48;
    transition: opacity 140ms ease, stroke-width 140ms ease, stroke 140ms ease;
  }

  .edge.highlight {
    stroke: #121816;
    stroke-width: 5;
    opacity: 1;
  }

  .graph-node {
    outline: none;
    transition: opacity 140ms ease;
  }

  .graph-node circle {
    fill: #ffffff;
    stroke: #121816;
    stroke-width: 4;
    filter: drop-shadow(0 10px 16px rgba(18, 24, 22, 0.16));
  }

  .graph-node[data-color="red"] circle {
    fill: #f6dfe1;
  }

  .graph-node[data-color="green"] circle {
    fill: #dff2e9;
  }

  .graph-node[data-color="yellow"] circle {
    fill: #fff2c5;
  }

  .graph-node.active circle,
  .graph-node:focus-visible circle {
    stroke-width: 7;
  }

  .graph-node.dimmed {
    opacity: 0.22;
  }

  .graph-node text {
    user-select: none;
    pointer-events: none;
    fill: #121816;
  }

  .node-date {
    font-size: 15px;
    font-weight: 900;
  }

  .node-title {
    font-size: 10px;
    font-weight: 800;
  }

  .map-summary {
    border-left: 1px solid #d8ded8;
    padding: 24px;
    background: #ffffff;
  }

  .map-summary h3 {
    margin: 18px 0 10px;
    font-size: 1.3rem;
    line-height: 1.2;
    letter-spacing: 0;
  }

  .map-summary p {
    color: #2b3933;
    line-height: 1.6;
  }

  .prep-notes {
    padding: 24px;
  }

  .prep-heading {
    display: grid;
    gap: 8px;
    max-width: 820px;
  }

  .prep-heading h2 {
    margin: 0;
    font-size: clamp(1.6rem, 3vw, 2.4rem);
    line-height: 1.08;
    letter-spacing: 0;
  }

  .prep-heading p {
    margin: 0;
    color: #2b3933;
    line-height: 1.6;
  }

  .prep-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin-top: 22px;
  }

  .prep-card {
    min-width: 0;
    border: 1px solid #cbd4cc;
    border-radius: 8px;
    padding: 18px;
    background: #ffffff;
  }

  .prep-card-heading {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .prep-card-heading span {
    display: inline-grid;
    flex: 0 0 auto;
    width: 34px;
    height: 34px;
    place-items: center;
    border-radius: 50%;
    background: #121816;
    color: #ffffff;
    font-weight: 900;
  }

  .prep-card h3 {
    margin: 2px 0 0;
    font-size: 1.08rem;
    line-height: 1.28;
    letter-spacing: 0;
  }

  .prep-summary {
    margin: 12px 0 0;
    color: #4a5751;
    line-height: 1.55;
  }

  .prep-card ul {
    display: grid;
    gap: 12px;
    margin: 16px 0 0;
    padding: 0;
    list-style: none;
  }

  .prep-card li {
    border-top: 1px solid #d8ded8;
    padding-top: 12px;
  }

  .prep-card li strong {
    display: block;
    color: #121816;
    font-size: 0.9rem;
  }

  .prep-card li span {
    display: block;
    margin-top: 4px;
    color: #2b3933;
    line-height: 1.55;
  }

  .pulse {
    animation: pulseBorder 850ms ease;
  }

  @keyframes pulseBorder {
    0% {
      box-shadow: 0 0 0 0 rgba(212, 154, 22, 0.55);
    }
    100% {
      box-shadow: 0 0 0 18px rgba(212, 154, 22, 0);
    }
  }

  @media (max-width: 980px) {
    .case-header,
    .timeline-layout,
    .map-layout,
    .prep-grid {
      grid-template-columns: 1fr;
    }

    .case-visual {
      max-height: 260px;
    }

    .control-band {
      grid-template-columns: 1fr;
    }

    .timeline-panel,
    .map-summary {
      border-right: 0;
      border-left: 0;
      border-top: 1px solid #d8ded8;
    }

    .map-summary {
      border-top: 1px solid #d8ded8;
    }
  }

  @media (max-width: 720px) {
    .case-shell {
      width: min(100% - 20px, 1180px);
      padding-top: 10px;
    }

    .case-header,
    .control-band,
    .journey,
    .timeline-panel,
    .detail-card,
    .map-toolbar,
    .map-summary,
    .prep-notes {
      padding: 16px;
    }

    .case-header {
      min-height: 0;
    }

    h1 {
      font-size: 2.15rem;
    }

    .lead {
      font-size: 1rem;
    }

    .person-facts,
    .journey-track,
    .detail-grid {
      grid-template-columns: 1fr;
    }

    .timeline-layout {
      display: block;
      min-height: 0;
    }

    .timeline-panel {
      border-top: 0;
    }

    .detail-card {
      display: none;
    }

    .detail-card.mobile-open {
      position: fixed;
      z-index: 10;
      inset: 0;
      display: block;
      overflow-y: auto;
      padding: 18px;
    }

    .mobile-back {
      display: inline-flex;
      align-items: center;
    }

    .map-toolbar {
      align-items: flex-start;
      flex-direction: column;
    }

    .graph-shell {
      min-height: 430px;
      padding: 8px;
    }

    .graph {
      min-height: 430px;
    }
  }
</style>
