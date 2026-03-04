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
