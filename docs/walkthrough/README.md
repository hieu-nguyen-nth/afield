# Illustrated product walkthrough

These are current-build captures of Afield's rendered interface using synthetic, intercepted API responses. The account is `reader@example.test`; example publishers and research text are fictional. Nothing here claims live authentication, researched facts, speech generation or real scheduled execution. Reproduce with `npm run build`, then `npm run docs:screenshots`. The test uses an isolated local server and validates both journeys, source approval, limit confirmation and narration consent.

## Explore and read

1. **Sign in:** use an invited verified account. Email/password and Google are offered; this capture uses a guest API fixture.

![Sign in](images/01-sign-in.png)

2. **Overview:** choose Explore for a question or Stay Updated for an ongoing topic. Saved briefs appear here after publication.

![Overview](images/02-overview.png)

3. **Compose:** enter the question and context; choose depth, word/listening budget, coverage mode and each source's reading method.

![Explore composer](images/03-explore.png)

4. **Resolve a conflicting limit:** this example asks for 1,000 words but selects 400. Afield asks which limit to use. When no conflict exists, Make my brief proceeds without this extra confirmation screen.

![Limit confirmation](images/04-explore-review.png)

5. **Follow progress:** inspect the current stage, elapsed/provisional time and saved activity. Provider or worker failures remain visible and can offer a retry.

![Run progress](images/05-progress.png)

6. **Read and verify:** read the saved text, follow citations, and expand original-request/source coverage. Retrieved does not always mean cited; limitations must remain visible. Revise starts a new request.

![Saved brief and coverage](images/06-brief.png)

7. **Request narration:** opening the brief makes no generation call. Pressing Generate audio explicitly queues narration. The pictured state is pending, not proof of real speech output. When verified media is ready, the player replaces this state.

![Requested narration](images/07-audio-requested.png)

## Set up ongoing updates

8. **Configure a topic:** name the topic, explain the goal, select optional subtopics and set depth/frequency/time/timezone. Tick/color chips show selected interests; deselection keeps the option visible.

![Topic settings and schedule](images/08-topic-settings.png)

9. **Review sources:** recommendations begin unapproved. Check the publisher/rationale and reading method, then explicitly choose Use source. Site search discovers new pages within the selected publication and uses Tavily allowance.

![Recurring sources](images/09-topic-sources.png)

10. **Make a template:** copy, name, order and select content blocks. Choose the output budget and active template for future updates.

![Topic templates](images/10-topic-templates.png)

11. **Review activation:** inspect focus, approved sources, research policy, template and schedule. Confirm and activate schedules future work; it does not silently generate the first brief.

![Activation review](images/11-topic-review.png)

12. **Manage topics:** see status and configured coverage; open the topic or deliberately generate a new update.

![Active topics](images/12-topics.png)

13. **Control an individual update:** Latest offers the one-off coverage selector, explicit Generate an update, and pause/resume controls. One-off coverage leaves the saved schedule policy unchanged. This fixture shows the interface and does not execute a live scheduled update.

![Topic latest and manual update controls](images/17-topic-latest.png)

## Return and manage your data

14. **History:** find saved text by date and topic; multiple results can share a day. Published text stays unchanged after configuration edits.

![Calendar history](images/13-history.png)

15. **Account and usage:** inspect the shared allowance, reset times and request history. Retry identity and brief allowance differ from short-term request throttling.

![Account usage](images/14-account.png)

16. **Privacy:** export owned JSON, download audio separately and request deletion. Deletion remains pending until worker cleanup completes; the walkthrough never presses delete.

![Privacy settings](images/15-privacy.png)

17. **Mobile:** the same flows fit a narrow viewport; browser regression checks verify no horizontal overflow.

![Mobile Explore](images/16-mobile.png)

See [user guide](../USER-GUIDE.md), [workflows](../product/WORKFLOWS.md) and [test results](../testing/RESULTS.md). Full live-service acceptance is tracked separately from this illustrated flow.
