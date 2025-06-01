<script lang="ts">
    import Hls from "hls.js";
    import workerHls from "hls.js/dist/hls.worker?url";
    import { HlsModed } from "../logic/hls-moded";
    import Icon from "@iconify/svelte";
    import { formatNumber } from "../logic/formatNumber";
    import { processQuality } from "../logic/processQuality";
    import { formatQuality } from "../logic/formatQuality";
    import { SvelteToast, toast } from "@zerodevx/svelte-toast";
    import { preResolveRequest } from "../logic/preResolveRequest.thread";

    let isM3u8 = $state<string>("");
    let isPlaying = $state<boolean>(false);
    let Player: HTMLVideoElement;
    let isPercentLoaded = $state<number>(0);
    let isPercentPlayed = $state<number>(0);
    let isCurrentTime = $state<string>("00:00");
    let isDuration = $state<string>("00:00");
    let isControlShow = $state<boolean>(true);
    let isCurrentingTime = $state<boolean>(false);
    let activeTime = $state<number>(Date.now());
    let isCurrentTimeTemp = $state<number>(0);
    let isPress = $state<boolean>(false);
    let isVideoPlayer = $state<HTMLDivElement>();
    let isFullscreen = $state<boolean>(false);
    let isMute = $state<boolean>(false);
    let isQualityShow = $state<boolean>(false);
    let isQualitys = $state<{ quality: string; type: number }[]>([]);
    let isHls = $state<Hls>();
    let isIndexQuality = $state<number>(0);
    let isPlaylistM3u8 = $state<string[]>([]);
    let isCountPreResolveRequest = $state<number>(100);
    const PreResolveReq = new Map<number, string>();

    const showToast = (msg: string) => {
        toast.push(msg, {
            theme: {
                "--toastColor": "mintcream",
                "--toastBackground": "rgba(72,187,120,0.9)",
                "--toastBarBackground": "#2F855A",
                "--toastBarHeight": 0,
            },
        });
    };

    const handlerPlayVideo = () => {
        isPlaying = !isPlaying;
        if (isPlaying) {
            Player.play();
        } else {
            Player.pause();
        }
    };
    const onProgress = () => {
        const target = Player;
        let range = 0;
        const bf = target.buffered;
        const time = target.currentTime;
        try {
            while (!(bf.start(range) <= time && time <= bf.end(range))) {
                range += 1;
            }
            const loadEndPercentage = bf.end(range) / target.duration;
            isPercentLoaded = loadEndPercentage;
        } catch {
            try {
                isPercentLoaded = bf.end(0) / target.duration;
            } catch {}
        }
    };
    const onMoveMouse = (e: MouseEvent) => {
        if (isPress) {
            isCurrentingTime = true;
            const targer = e.currentTarget as HTMLDivElement;
            const offsetX = targer.getBoundingClientRect().x;
            const maxX = targer.offsetWidth;
            // const { left } = targer.getBoundingClientRect();
            if (offsetX) {
                const clientX = e.clientX - offsetX;
                const currentTime = Math.max(
                    0,
                    Math.min(
                        Player.duration,
                        (Player.duration * clientX) / maxX
                    )
                );
                isCurrentTime =
                    currentTime > 3600
                        ? `${formatNumber(currentTime / 3600)}:${formatNumber(currentTime / 60)}:${formatNumber(
                              currentTime % 60
                          )}`
                        : `${formatNumber(currentTime / 60)}:${formatNumber(
                              currentTime % 60
                          )}`;
                isPercentPlayed = (currentTime / Player.duration) * 100;
                isCurrentTimeTemp = currentTime;
                activeTime = Date.now();
            }
        }
    };
    const onEnd = () => {
        isPress = false;
        Player.currentTime = isCurrentTimeTemp;
        isCurrentingTime = false;
        activeTime = Date.now();
    };
    const onTimeUpdate = () => {
        if (
            Date.now() - activeTime >= 3e3 &&
            isControlShow &&
            !isCurrentingTime &&
            isPlaying
        )
            isControlShow = false;

        const currentTime = Player.currentTime;
        const duration = Number.isNaN(Player.duration) ? 0 : Player.duration;
        isCurrentTime =
            currentTime > 3600
                ? `${formatNumber(currentTime / 3600)}:${formatNumber(currentTime / 60)}:${formatNumber(
                      currentTime % 60
                  )}`
                : `${formatNumber(currentTime / 60)}:${formatNumber(
                      currentTime % 60
                  )}`;
        isDuration =
            duration > 3600
                ? `${formatNumber(duration / 3600)}:${formatNumber(duration / 60)}:${formatNumber(
                      duration % 60
                  )}`
                : `${formatNumber(duration / 60)}:${formatNumber(
                      duration % 60
                  )}`;
        isPercentPlayed = (currentTime / duration) * 100;
    };
    const handleFullscreen = () => {
        if (isFullscreen) {
            document.exitFullscreen();
            (screen as any).orientation.unlock();
            isFullscreen = false;
        } else {
            isVideoPlayer!.requestFullscreen();
            (screen as any).orientation.lock("landscape");
            isFullscreen = true;
        }
    };
    const handleMute = () => {
        if (isMute) {
            Player.muted = false;
            isMute = false;
        } else {
            Player.muted = true;
            isMute = true;
        }
    };
    const handleQuality = (type: number) => {
        isHls!.currentLevel = type;
        isIndexQuality = type;
    };
    const fetchM3u8 = async () => {
        const response = await fetch(
            "https://raw.githubusercontent.com/fwy13/RoxyApi/refs/heads/main/media.m3u8?token=GHSAT0AAAAAADC5PB3T6DUM2ZD65HLA52PE2A3GXVA"
        ).then((res) => res.text());

        // const m3u8 = response.tiktokM3u8.playlists;
        // const m3u8Encode = processQuality(m3u8);
        // isPlaylistM3u8 = m3u8;
        // const master = response.tiktokM3u8.master;
        // let countM3u8 = -1;
        // const replaced = master.replace(/^[A-Za-z0-9].*?\.m3u8$/gm, () => {
        //     countM3u8++;
        //     return m3u8Encode[countM3u8];
        // });
        isM3u8 = `data:application/vnd.apple.mpegurl;base64,${btoa(response)}`;
    };
    $effect(() => {
        fetchM3u8();
    });

    $effect(() => {
        if (Hls.isSupported()) {
            const hls = new HlsModed(
                {
                    workerPath: workerHls,
                    progressive: true,
                    fragLoadingRetryDelay: 10000,
                    fetchSetup(context, initParams) {
                        return new Request(context.url, initParams);
                    },
                },
                async (request) => {
                    console.log(request.url);
                    return fetch(request.url, request);
                }
            );
            isHls = hls;
            hls.loadSource(isM3u8);
            hls.attachMedia(Player);
            hls.on(Hls.Events.MANIFEST_PARSED, (e, data) => {
                console.log(data);
                if (isPlaying) Player.play();
                // const levels = data.levels;
                // levels.map((level, i) => {
                //     isQualitys.push({
                //         quality: `${formatQuality(level.width)}`,
                //         type: i,
                //     });
                // });
            });
            hls.on(Hls.Events.LEVEL_LOADED, (e, data) => {
                isIndexQuality = data.level;
            });
            hls.on(Hls.Events.LEVEL_SWITCHED, (e, data) => {
                isIndexQuality = data.level;
                showToast(`Đã chuyển sang ${isQualitys[data.level].quality}`);
            });
            return () => {
                hls.destroy();
            };
        }
    });

    const onTouchStart = (e: TouchEvent) => {
        isCurrentingTime = true;
        const target = e.target as HTMLDivElement;
        const offsetX = target.getBoundingClientRect().x;
        const maxX = target.offsetWidth;
        const { left } = target.getBoundingClientRect();
        if (offsetX) {
            const clientX =
                (
                    (event as TouchEvent).changedTouches?.[0] ??
                    (event as TouchEvent).touches?.[0] ??
                    event
                ).clientX -
                offsetX -
                left;
            isCurrentTimeTemp = Math.max(
                0,
                Math.min(Player.duration, (Player.duration * clientX) / maxX)
            );

            activeTime = Date.now();
        }
    };
</script>

<div class="relative w-full h-auto overflow-hidden" bind:this={isVideoPlayer}>
    <!-- svelte-ignore a11y_media_has_caption -->
    <!-- svelte-ignore event_directive_deprecated -->
    <video
        bind:this={Player}
        class="w-full h-screen object-fit aspect-video"
        on:play={() => {
            isPlaying = true;
        }}
        on:pause={() => {
            isPlaying = false;
        }}
        on:progress={onProgress}
        on:canplay={onTimeUpdate}
        on:timeupdate={!isCurrentingTime ? onTimeUpdate : () => {}}
    ></video>

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore event_directive_deprecated -->
    <div
        class="absolute inset-0 bg-[#00000056] flex-col"
        style:display={isControlShow ? "flex" : "none"}
    >
        <div
            class="absolute bottom-0 left-0 right-0 w-full px-3 py-4 bg-gradient-to-t from-black to-transparent"
        >
            <!-- svelte-ignore a11y_mouse_events_have_key_events -->
            <div class="flex flex-col gap-2 items-center text-white">
                <div class="w-full">
                    <div
                        class="flex items-center relative h-[3px] w-full bg-[#fff3] transition-[height] duration-[0.50s] ease-[ease-in-out]"
                        on:mousedown={() => {
                            isPress = true;
                        }}
                        on:mousemove={onMoveMouse}
                        on:mouseup={onEnd}
                        on:mouseover={() => {
                            isPress = false;
                        }}
                        on:mouseout={() => {
                            isPress = false;
                        }}
                    >
                        <div
                            class="absolute z-[10] left-0 top-0 right-0 bottom-0 h-full w-0 bg-[#fff6] pointer-events-none"
                            style:width={`${isPercentLoaded}%`}
                        ></div>
                        <div
                            class="absolute z-[20] left-0 top-0 right-0 bottom-0 h-full w-0 bg-[#00c234] pointer-events-none"
                            style:width={`${isPercentPlayed}%`}
                        ></div>
                        <div
                            class="absolute z-[22] left-0 top-0 right-0 bottom-0 w-0 h-full pointer-events-none"
                            style:width={`${isPercentPlayed}%`}
                        >
                            <div
                                class="absolute size-[15px] right-[-10px] top-[calc(100%-9px)] transition-transform duration-[0.2s] ease-[ease-in-out] z-[22]"
                            >
                                <!-- svelte-ignore a11y_missing_attribute -->
                                <img
                                    src="https://artplayer.org/assets/img/indicator.svg"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex w-full justify-between">
                    <!-- svelte-ignore event_directive_deprecated -->
                    <div class="flex gap-3 items-center">
                        <button
                            on:click={handlerPlayVideo}
                            class="active:bg-[#ffffff38] rounded-full p-1"
                        >
                            {#if !isPlaying}
                                <Icon
                                    icon="material-symbols:play-arrow-rounded"
                                    class="size-8"
                                />
                            {:else}
                                <Icon
                                    icon="material-symbols:pause-outline-rounded"
                                    class="size-8"
                                />
                            {/if}
                        </button>
                        <div>
                            {isCurrentTime} / {isDuration}
                        </div>
                        <div class="flex items-center">
                            <button on:click={handleMute}>
                                {#if !isMute}
                                    <Icon
                                        icon="material-symbols:volume-up-rounded"
                                        class="size-6"
                                    />
                                {:else}
                                    <Icon
                                        icon="material-symbols:volume-off-rounded"
                                        class="size-6"
                                    />
                                {/if}
                            </button>
                        </div>
                    </div>
                    {#if isQualityShow}
                        <div
                            class="absolute bottom-20 right-5 w-[200px] bg-[#0000006d] flex flex-col gap-2 pb-2 text-center items-center rounded"
                        >
                            <h1 class="bg-[#000000b3] w-full p-2 rounded-t">
                                Chất lượng
                            </h1>
                            {#each isQualitys as quality, i}
                                <button
                                    style:color={i === isIndexQuality
                                        ? "#00c234"
                                        : ""}
                                    on:click={() => {
                                        handleQuality(quality.type);
                                    }}
                                >
                                    {quality.quality}
                                </button>
                            {/each}
                        </div>
                    {/if}
                    <div class="flex items-center gap-3">
                        <button
                            class="flex gap-2"
                            on:click={() => {
                                isQualityShow = !isQualityShow;
                            }}
                        >
                            <Icon
                                icon="material-symbols:high-quality-rounded"
                                class="size-6"
                            />
                        </button>
                        <button>
                            <Icon
                                icon="material-symbols:settings-rounded"
                                class="size-6"
                            />
                        </button>
                        <button on:click={handleFullscreen}>
                            {#if !isFullscreen}
                                <Icon
                                    icon="material-symbols-light:fullscreen"
                                    class="size-6"
                                />
                            {:else}
                                <Icon
                                    icon="material-symbols-light:fullscreen-exit"
                                    class="size-6"
                                />
                            {/if}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <SvelteToast />
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore event_directive_deprecated -->
    <div
        class="absolute inset-0 cursor-none flex-col"
        style:display={isControlShow ? "none" : "flex"}
        on:mousemove={() => {
            activeTime = Date.now();
            isControlShow = true;
        }}
    ></div>
</div>
