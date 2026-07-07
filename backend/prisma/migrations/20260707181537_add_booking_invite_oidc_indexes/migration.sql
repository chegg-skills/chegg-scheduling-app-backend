-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_studentEmail_idx" ON "Booking"("studentEmail");

-- CreateIndex
CREATE INDEX "OidcState_expiresAt_idx" ON "OidcState"("expiresAt");

-- CreateIndex
CREATE INDEX "UserInvite_email_idx" ON "UserInvite"("email");
