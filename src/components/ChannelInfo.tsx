import React, { useContext, useEffect, useRef } from 'react';
import Rect from '../models/Rect';
import EPGUtils from '../utils/EPGUtils';
import CanvasUtils, { WriteTextOptions } from '../utils/CanvasUtils';
import AppContext from '../AppContext';
import '../styles/app.css';

const ChannelInfo = (props: { unmount: () => void }) => {
    const { locale, epgData, imageCache, currentChannelPosition } = useContext(AppContext);

    const canvas = useRef<HTMLCanvasElement>(null);
    const infoWrapper = useRef<HTMLDivElement>(null);
    const timeoutReference = useRef<NodeJS.Timeout | null>(null);
    const intervalReference = useRef<NodeJS.Timeout | null>(null);

    const mChannelInfoHeight = 150;
    const mChannelInfoTitleSize = 42;
    const mChannelInfoKeyDescSize = 20;
    const mChannelInfoKeyPadding = 20;
    const mChannelInfoKeyRectWidth = 20;
    const mChannelLayoutTextColor = '#cccccc';
    const mChannelLayoutTitleTextColor = '#969696';
    const mChannelInfoTimeBoxWidth = 375;
    const mChannelLayoutMargin = 3;
    const mChannelLayoutPadding = 7;
    const mChannelNextTitleMaxLength = 900;
    //const mChannelLayoutBackground = '#323232';
    //const mChannelLayoutBackgroundFocus = 'rgba(29,170,226,1)';

    const handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const keyCode = event.keyCode;

        switch (keyCode) {
            case 461: // back button
            case 13: // ok button -> switch to focused channel
                // do not pass this event to parent
                event.stopPropagation();
                props.unmount();
                break;
        }

        // pass unhandled events to parent
        if (!event.isPropagationStopped) return event;
    };

const drawChannelInfo = (canvas: CanvasRenderingContext2D) => {
        // Background
        let drawingRect = new Rect();
        drawingRect.left = 0;
        drawingRect.top = 0;
        drawingRect.right = getWidth();
        drawingRect.bottom = getHeight();
        canvas.globalAlpha = 1.0;
        canvas.strokeStyle = 'gradient';
        const grd = canvas.createLinearGradient(
            drawingRect.left,
            drawingRect.left,
            drawingRect.right,
            drawingRect.left
        );
        grd.addColorStop(0, 'rgba(11, 39, 58, 0.9)');
        grd.addColorStop(0.5, 'rgba(35, 64, 84, 0.9)');
        grd.addColorStop(1, 'rgba(11, 39, 58, 0.9)');
        canvas.fillStyle = grd;
        canvas.fillRect(drawingRect.left, drawingRect.top, drawingRect.width, drawingRect.bottom);

        drawingRect.left += mChannelLayoutMargin;
        drawingRect.top += mChannelLayoutMargin;
        drawingRect.right -= mChannelLayoutMargin;
        drawingRect.bottom -= mChannelLayoutMargin;

        const channel = epgData.getChannel(currentChannelPosition);
        if (!channel) return;

        // channel logo
        drawingRect.left += 20;
        drawingRect.top = 0;
        drawingRect.right = drawingRect.left + drawingRect.height + 50;
        canvas.textAlign = 'left';
        const imageURL = channel.getImageURL();
        const image = imageURL && imageCache.get(imageURL);
        if (image !== undefined) {
            const imgRect = getDrawingRectForChannelImage(new Rect(drawingRect.left, drawingRect.top, drawingRect.right, drawingRect.bottom), image);
            canvas.drawImage(image, imgRect.left, imgRect.top, imgRect.width, imgRect.height);
        }

        // content area starts after logo
        const contentLeft = drawingRect.right + 20;
        drawingRect.left = contentLeft;
        drawingRect.right = getWidth();
        drawingRect.top = getHeight() / 2 - mChannelInfoTitleSize + mChannelInfoTitleSize / 2 + mChannelLayoutPadding;

        let currentEvent, nextEvent;
        for (const event of channel.getEvents()) {
            if (event.isCurrent()) {
                currentEvent = event;
                continue;
            }
            if (currentEvent) {
                nextEvent = event;
                break;
            }
        }

        if (currentEvent !== undefined) {
            // --- CU EPG: comportament original ---
            const left = drawingRect.left;
            drawingRect.right -= mChannelInfoTimeBoxWidth;

            if (epgData.isRecording(currentEvent)) {
                const radius = 10;
                canvas.fillStyle = '#FF0000';
                canvas.beginPath();
                canvas.arc(drawingRect.left + radius, drawingRect.top - radius, radius, 0, 2 * Math.PI);
                canvas.fill();
                drawingRect.left += 2 * radius + 2 * mChannelLayoutPadding;
            }

            canvas.font = 'bold ' + mChannelInfoTitleSize + 'px Moonstone';
            canvas.fillStyle = mChannelLayoutTextColor;
            canvas.fillText(
                CanvasUtils.getShortenedText(canvas, currentEvent.getTitle(), drawingRect.width),
                drawingRect.left,
                drawingRect.top
            );

            drawingRect.right += mChannelInfoTimeBoxWidth;
            drawingRect.left = drawingRect.right - mChannelLayoutPadding - 20;
            canvas.textAlign = 'right';
            canvas.font = 'bold ' + mChannelInfoTitleSize + 'px Moonstone';
            canvas.fillStyle = mChannelLayoutTextColor;
            canvas.fillText(
                EPGUtils.toTimeFrameString(currentEvent.getStart(), currentEvent.getEnd(), locale),
                drawingRect.left,
                drawingRect.top
            );
            canvas.textAlign = 'left';

            canvas.font = mChannelInfoTitleSize - 8 + 'px Moonstone';
            drawingRect.top += mChannelInfoTitleSize - 5 + mChannelLayoutPadding;
            if (currentEvent.getSubTitle() !== undefined) {
                drawingRect.left = left;
                drawingRect.right -= mChannelInfoTimeBoxWidth;
                canvas.fillStyle = mChannelLayoutTitleTextColor;
                canvas.fillText(
                    CanvasUtils.getShortenedText(canvas, currentEvent.getSubTitle(), drawingRect.width),
                    drawingRect.left,
                    drawingRect.top
                );
                drawingRect.right += mChannelInfoTimeBoxWidth;
            }

            const runningTime = EPGUtils.toDuration(currentEvent.getStart(), EPGUtils.getNow());
            const remainingTime = Math.ceil((currentEvent.getEnd() - EPGUtils.getNow()) / 1000 / 60);
            drawingRect.left = drawingRect.right - mChannelLayoutPadding - 20;
            canvas.textAlign = 'right';
            canvas.font = mChannelInfoTitleSize - 8 + 'px Moonstone';
            canvas.fillStyle = mChannelLayoutTitleTextColor;
            canvas.fillText(runningTime + ' (+' + remainingTime + ')', drawingRect.left, drawingRect.top);

            drawingRect.top += mChannelInfoTitleSize - 14 + mChannelLayoutPadding;
            const nextEventTextOptions: WriteTextOptions = {
                textAlign: 'right',
                textBaseline: 'alphabetic',
                fontSize: mChannelInfoTitleSize - 18
            };

            if (nextEvent !== undefined) {
                canvas.font = mChannelInfoTitleSize - 18 + 'px Moonstone';
                const titleMetrics = canvas.measureText(nextEvent.getTitle());
                const titleLength =
                    titleMetrics.width > mChannelNextTitleMaxLength ? mChannelNextTitleMaxLength : titleMetrics.width;
                canvas.fillStyle = mChannelLayoutTextColor;
                CanvasUtils.writeText(canvas, nextEvent.getTitle(), drawingRect.left, drawingRect.top, {
                    ...nextEventTextOptions,
                    maxWidth: titleLength < mChannelNextTitleMaxLength ? undefined : mChannelNextTitleMaxLength
                });
                drawingRect.left -= titleLength + mChannelLayoutPadding;
                CanvasUtils.writeText(
                    canvas,
                    EPGUtils.toTimeFrameString(nextEvent.getStart(), nextEvent.getEnd(), locale),
                    drawingRect.left,
                    drawingRect.top,
                    { ...nextEventTextOptions, fillStyle: 'rgb(65, 182, 230)' }
                );
            }

            // progress bar
            const channelEventProgressRect = new Rect(0, 0, 6, getWidth());
            const grdProg = canvas.createLinearGradient(0, 0, getWidth(), 0);
            grdProg.addColorStop(0, 'rgba(80, 80, 80, 0.75)');
            grdProg.addColorStop(0.5, 'rgba(200, 200, 200, 0.75)');
            grdProg.addColorStop(1, 'rgba(80, 80, 80, 0.75)');
            const grdProg2 = canvas.createLinearGradient(0, 0, getWidth(), 0);
            grdProg2.addColorStop(0, 'rgba(19, 126, 169, 0.75)');
            grdProg2.addColorStop(0.5, 'rgba(65, 182, 230, 0.75)');
            grdProg2.addColorStop(1, 'rgba(19, 126, 169, 0.75)');
            canvas.fillStyle = grdProg;
            canvas.fillRect(channelEventProgressRect.left, channelEventProgressRect.top, channelEventProgressRect.width, channelEventProgressRect.height);
            canvas.fillStyle = grdProg2;
            canvas.fillRect(channelEventProgressRect.left, channelEventProgressRect.top, channelEventProgressRect.width * currentEvent.getDoneFactor(), channelEventProgressRect.height);

            // color keys — cu EPG
            drawColorKeys(canvas, left, drawingRect.top);

        } else {
            // --- FĂRĂ EPG: afișăm numele canalului + legenda butoanelor ---
            canvas.font = 'bold ' + mChannelInfoTitleSize + 'px Moonstone';
            canvas.fillStyle = mChannelLayoutTextColor;
            canvas.textAlign = 'left';
            canvas.fillText(
                channel.getName(),
                drawingRect.left,
                drawingRect.top
            );

            // color keys — fără EPG (aceeași poziție, un rând mai jos)
            drawColorKeys(canvas, drawingRect.left, drawingRect.top + mChannelInfoTitleSize + mChannelLayoutPadding * 2);
        }
    };

    // ─── helper extras: desenează legenda roșu/verde/galben/albastru ──────────
    const drawColorKeys = (canvas: CanvasRenderingContext2D, left: number, top: number) => {
        top -= mChannelInfoKeyDescSize / 2;
        canvas.font = mChannelInfoKeyDescSize + 'px Moonstone';
        canvas.textAlign = 'left';

        let x = left;

        // roșu — Rec
        canvas.fillStyle = '#EF3343';
        canvas.fillRect(x, top, mChannelInfoKeyRectWidth, 10);
        x += mChannelInfoKeyRectWidth + mChannelLayoutPadding;
        const recMetrics = canvas.measureText('Rec');
        CanvasUtils.writeText(canvas, 'Rec', x, top + 5);
        x += recMetrics.width + mChannelLayoutPadding + mChannelInfoKeyPadding;

        // verde — Menu
        canvas.fillStyle = '#46BB3E';
        canvas.fillRect(x, top, mChannelInfoKeyRectWidth, 10);
        x += mChannelInfoKeyRectWidth + mChannelLayoutPadding;
        const menuMetrics = canvas.measureText('Menu');
        CanvasUtils.writeText(canvas, 'Menu', x, top + 5);
        x += menuMetrics.width + mChannelLayoutPadding + mChannelInfoKeyPadding;

        // galben — Audio
        canvas.fillStyle = '#FBC821';
        canvas.fillRect(x, top, mChannelInfoKeyRectWidth, 10);
        x += mChannelInfoKeyRectWidth + mChannelLayoutPadding;
        const audioMetrics = canvas.measureText('Audio');
        CanvasUtils.writeText(canvas, 'Audio', x, top + 5);
        x += audioMetrics.width + mChannelLayoutPadding + mChannelInfoKeyPadding;

        // albastru — EPG
        canvas.fillStyle = '#4065B8';
        canvas.fillRect(x, top, mChannelInfoKeyRectWidth, 10);
        x += mChannelInfoKeyRectWidth + mChannelLayoutPadding;
        CanvasUtils.writeText(canvas, 'EPG', x, top + 5);
    };

    const getDrawingRectForChannelImage = (drawingRect: Rect, image: HTMLImageElement) => {
        const imageWidth = image.width;
        const imageHeight = image.height;
        const imageRatio = imageHeight / imageWidth;

        const rectWidth = drawingRect.right - drawingRect.left;
        const rectHeight = drawingRect.bottom - drawingRect.top;

        // Keep aspect ratio.
        if (imageWidth > imageHeight) {
            const padding = (rectHeight - rectWidth * imageRatio) / 2;
            drawingRect.top += padding;
            drawingRect.bottom -= padding;
        } else if (imageWidth <= imageHeight) {
            const padding = (rectWidth - rectHeight / imageRatio) / 2;
            drawingRect.left += padding;
            drawingRect.right -= padding;
        }

        return drawingRect;
    };

    const getWidth = () => {
        return window.innerWidth;
    };

    const getHeight = () => {
        return mChannelInfoHeight;
    };

    /** set timeout to automatically unmount */
    const resetUnmountTimeout = () => {
        timeoutReference.current && clearTimeout(timeoutReference.current);
        timeoutReference.current = setTimeout(() => props.unmount(), 8000);
    };

    useEffect(() => {
        focus();

        return () => {
            timeoutReference.current && clearTimeout(timeoutReference.current);
            intervalReference.current && clearInterval(intervalReference.current);
        };
    }, []);

    useEffect(() => {
        // update the canvas in short intervals, to display the remaining time live
        intervalReference.current && clearInterval(intervalReference.current);
        intervalReference.current = setInterval(() => {
            updateCanvas();
        }, 500);

        updateCanvas();
        resetUnmountTimeout();
    }, [currentChannelPosition]);

    const focus = () => {
        infoWrapper.current?.focus();
    };

    const updateCanvas = () => {
        if (canvas.current) {
            const ctx = canvas.current.getContext('2d');
            // clear
            ctx && ctx.clearRect(0, 0, getWidth(), getHeight());

            // draw child elements
            ctx && onDraw(ctx);
        }
    };

    const onDraw = (canvas: CanvasRenderingContext2D) => {
        if (epgData !== null && epgData.hasData()) {
            drawChannelInfo(canvas);
        }
    };

    return (
        <div
            id="channelinfo-wrapper"
            ref={infoWrapper}
            tabIndex={-1}
            onKeyDown={handleKeyPress}
            className="channelInfo"
        >
            <canvas ref={canvas} width={getWidth()} height={getHeight()} style={{ display: 'block' }} />
        </div>
    );
};

export default ChannelInfo;
