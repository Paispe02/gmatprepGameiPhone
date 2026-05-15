#!/usr/bin/env python3
"""
Generate 20 original GMAT-style Critical Reasoning questions.
Standard format: passage + question stem + 5 answer choices (A-E).
Question types: Strengthen, Weaken, Assumption, Inference, Evaluate, Flaw, Boldface.
"""

import json, os

questions = []
qid = 1

def cr(difficulty, text, choices, correct, explanation):
    global qid
    q = {
        "id": f"cr{qid}",
        "category": "criticalReasoning",
        "difficulty": difficulty,
        "text": text,
        "choices": choices,
        "correct": correct,
        "explanation": explanation
    }
    qid += 1
    return q

# CR1 — Weaken
questions.append(cr("medium",
    "A major airline has announced that it will reduce the legroom on its economy seats by two inches to add more rows. The airline argues that this will allow it to lower ticket prices by 8 percent, thereby increasing overall customer satisfaction.\n\nWhich of the following, if true, most seriously weakens the airline's argument?",
    [
        "Surveys show that legroom is the single most important factor in economy passengers' satisfaction.",
        "The airline's competitors have not announced plans to reduce legroom.",
        "The airline recently invested in new in-flight entertainment systems.",
        "Many economy passengers on the airline fly routes shorter than two hours.",
        "The airline's premium economy class will not be affected by the change."
    ],
    0,
    "The argument assumes lower prices → higher satisfaction. Choice A directly undermines this by showing legroom matters more than price to passengers, meaning reducing legroom would decrease satisfaction despite the price drop."
))

# CR2 — Assumption
questions.append(cr("hard",
    "City officials plan to reduce traffic congestion by converting two major avenues from four lanes to two lanes with dedicated bicycle paths. Officials predict that commuters will switch from cars to bicycles, thereby reducing the number of vehicles on all city roads.\n\nThe officials' plan assumes which of the following?",
    [
        "The bicycle paths will be completed before the next fiscal year.",
        "A significant number of current car commuters live close enough to their workplaces to make cycling a viable alternative.",
        "The city has adequate public transit options for commuters who do not cycle.",
        "Reducing lanes on two avenues will not divert car traffic to other streets.",
        "Bicycle commuting is more environmentally friendly than car commuting."
    ],
    1,
    "For the plan to work, commuters must actually switch from cars to bikes. This is only possible if cycling is a viable option — meaning they live close enough. Choice B identifies this necessary assumption. Without it, commuters would just drive on other roads or be stuck in worse traffic."
))

# CR3 — Strengthen
questions.append(cr("medium",
    "A pharmaceutical company claims that its new medication reduces the duration of common cold symptoms by an average of two days compared to no treatment. Critics argue that the clinical trial was flawed because participants who received the medication also received more bed rest than those in the control group.\n\nWhich of the following, if true, most strengthens the company's claim?",
    [
        "The medication has no known side effects.",
        "A follow-up study with controlled rest periods showed the same two-day reduction in symptom duration.",
        "Most patients who take cold medication also take other remedies simultaneously.",
        "The control group was larger than the treatment group.",
        "The medication contains a combination of well-studied active ingredients."
    ],
    1,
    "The critics' objection is that bed rest, not the drug, may explain the improvement. Choice B eliminates this confound by showing the same result when rest periods are controlled. This directly strengthens the company's claim."
))

# CR4 — Inference
questions.append(cr("medium",
    "In 2019, Country X exported more steel than any other country. In 2020, Country X's steel production decreased by 15 percent while its domestic consumption of steel increased by 10 percent. No other country significantly changed its steel production in 2020.\n\nWhich of the following can be properly inferred from the statements above?",
    [
        "Country X was no longer the world's largest steel producer in 2020.",
        "Country X's steel exports in 2020 were lower than in 2019.",
        "The global supply of steel decreased in 2020.",
        "Country X's domestic steel prices increased in 2020.",
        "Other countries increased their steel exports in 2020."
    ],
    1,
    "If production decreased and domestic consumption increased, then exports (= production - domestic consumption) must have decreased. This follows necessarily from the given information. The other choices go beyond what can be inferred."
))

# CR5 — Evaluate
questions.append(cr("hard",
    "A school board is considering replacing physical textbooks with tablets for all students in grades 6-12. Proponents argue that tablets will save money in the long run because digital materials are cheaper than printed textbooks.\n\nWhich of the following would be most useful to evaluate in order to assess the proponents' argument?",
    [
        "Whether students prefer reading on tablets or from printed textbooks.",
        "Whether the cost of purchasing and maintaining tablets, plus licensing digital content, exceeds the cost of printed textbooks over a five-year period.",
        "Whether tablets offer educational benefits beyond those of printed textbooks.",
        "Whether other school districts have adopted tablets.",
        "Whether the school board has the authority to mandate the change."
    ],
    1,
    "The argument is specifically about cost savings. To evaluate this, we need to compare the total costs of both options — tablets (hardware + maintenance + digital licensing) vs. textbooks — over a reasonable period. Choice B directly addresses this comparison."
))

# CR6 — Flaw
questions.append(cr("hard",
    "An executive argues: 'Our company's employee satisfaction survey shows that 85 percent of respondents are satisfied with their work environment. Therefore, the vast majority of our employees are satisfied.'\n\nWhich of the following indicates a flaw in the executive's reasoning?",
    [
        "The survey may have included questions that are ambiguous.",
        "Employees who are dissatisfied may have been less likely to respond to the survey.",
        "The company's industry typically has high employee satisfaction rates.",
        "Employee satisfaction can change from year to year.",
        "The survey was conducted by an internal team rather than an external firm."
    ],
    1,
    "The flaw is response bias: the executive assumes respondents are representative of all employees. If dissatisfied employees are less likely to respond (non-response bias), the 85% satisfaction rate among respondents would overstate satisfaction among all employees."
))

# CR7 — Strengthen
questions.append(cr("easy",
    "A health study found that people who eat breakfast every day have a lower body mass index (BMI) than those who skip breakfast. The researchers concluded that eating breakfast helps prevent weight gain.\n\nWhich of the following, if true, most strengthens the researchers' conclusion?",
    [
        "People who eat breakfast tend to have higher incomes than those who skip it.",
        "Skipping breakfast leads to increased calorie intake later in the day, resulting in a net caloric surplus.",
        "The study controlled for exercise habits and found no significant difference between the two groups.",
        "Breakfast foods tend to be lower in calories than lunch or dinner foods.",
        "The study included participants from a wide range of age groups."
    ],
    1,
    "Choice B provides a causal mechanism: skipping breakfast → eating more later → net caloric surplus → weight gain. This supports the conclusion that breakfast itself helps prevent weight gain, not just that it's correlated with lower BMI."
))

# CR8 — Assumption
questions.append(cr("medium",
    "A tech startup argues that remote work increases productivity because its remote employees complete 15 percent more tasks per week than its in-office employees.\n\nThe argument above depends on which of the following assumptions?",
    [
        "Remote employees work longer hours than in-office employees.",
        "The tasks completed by remote and in-office employees are comparable in complexity and scope.",
        "Remote employees have more experience than in-office employees.",
        "In-office employees spend more time commuting.",
        "The startup has more remote employees than in-office employees."
    ],
    1,
    "If remote workers are completing easier or smaller tasks, the 15% difference wouldn't indicate higher productivity. The argument assumes the tasks are comparable. Choice B identifies this necessary assumption."
))

# CR9 — Weaken
questions.append(cr("hard",
    "The government of Region Y recently implemented a ban on single-use plastic bags in grocery stores. Six months later, the total weight of plastic waste in the region's landfills decreased by 3 percent. Officials attribute this decrease to the bag ban.\n\nWhich of the following, if true, most seriously weakens the officials' conclusion?",
    [
        "Other regions that did not implement a ban saw no change in plastic waste.",
        "Many residents of Region Y began using reusable bags before the ban took effect.",
        "A major plastic manufacturing plant in Region Y closed two months before the ban, reducing industrial plastic waste by a significant amount.",
        "Single-use plastic bags account for less than 1 percent of total plastic waste by weight.",
        "The ban applies only to grocery stores and not to other retail establishments."
    ],
    2,
    "Choice C provides an alternative explanation for the 3% decrease: the plant closure, not the bag ban, caused the reduction. This directly weakens the claim that the ban is responsible. Choice D also weakens but C is stronger because it explains the entire observed effect."
))

# CR10 — Inference
questions.append(cr("easy",
    "All managers at Firm Q have completed the firm's leadership training program. Some employees who completed the leadership training program did not receive promotions last year.\n\nWhich of the following must be true?",
    [
        "Some managers at Firm Q did not receive promotions last year.",
        "All employees who received promotions are managers.",
        "Some employees who are not managers completed the leadership training program.",
        "Not all managers received promotions last year.",
        "It cannot be determined whether any manager did not receive a promotion."
    ],
    2,
    "All managers completed training. Some who completed training weren't promoted. But we can't conclude those unpromoted trainees were managers — they could be non-managers who also took the training. What MUST be true: the training program includes non-managers (since 'some employees who completed it' implies participants beyond just managers, or it could include managers). Actually, we know all managers did the training, and some trainees weren't promoted. This doesn't tell us about non-manager trainees.\n\nWait: 'Some employees who completed training didn't get promoted.' All managers completed training. But this doesn't mean ONLY managers completed it. However, 'some employees who completed training' didn't get promoted — these could be managers or non-managers.\n\nChoice C: 'Some non-managers completed training.' This isn't necessarily true — it's possible only managers took the training.\n\nActually, let me reconsider. Choice E says it can't be determined. But we can determine something: some trainees weren't promoted. Since all managers are trainees, the unpromoted trainees COULD be managers. We can't say for sure.\n\nBest answer: C is not necessarily true. The answer should be E.\n\nActually, let me reconsider once more. Choice C says some non-managers completed training. We don't know this. Choice A says some managers weren't promoted — possible but not certain. The only thing we know for sure: some training completers weren't promoted.\n\nLet me change this to make it cleaner."
))

# Fix CR10
questions[-1]["text"] = "All managers at Firm Q have completed the firm's leadership training program. Some employees who completed the leadership training program were hired from outside the company.\n\nWhich of the following must be true?"
questions[-1]["choices"] = [
    "Some managers were hired from outside the company.",
    "All employees hired from outside completed the training.",
    "Some employees who completed the training are not managers.",
    "No manager was hired from within the company.",
    "The training program is required only for managers."
]
questions[-1]["correct"] = 2
questions[-1]["explanation"] = "All managers completed training. Some who completed training were external hires. These external hires may or may not be managers. However, the fact that 'some employees who completed training were hired from outside' establishes that training participants exist who were external hires. Since 'all managers completed training,' we know managers are a subset of trainees. But the external-hire trainees expand the pool, showing that non-managers also completed training. Actually, they COULD be managers hired externally. So C isn't necessarily true either.\n\nLet me reconsider: Actually, C IS necessarily true if we read carefully. 'Some employees who completed training were hired from outside.' These external hires completed training. If ALL training completers were managers, then these external hires would be managers. But that's consistent — C says 'some are NOT managers,' which isn't forced.\n\nBetter fix: Change the question entirely."

# Let me redo CR10 properly
questions[-1]["text"] = "All of the 40 managers at Firm Q have MBAs. There are 100 employees with MBAs at Firm Q.\n\nWhich of the following must be true?"
questions[-1]["choices"] = [
    "Most employees at Firm Q have MBAs.",
    "Some employees with MBAs at Firm Q are not managers.",
    "At least 60 employees at Firm Q do not have MBAs.",
    "All employees with MBAs will eventually become managers.",
    "Firm Q has exactly 100 employees."
]
questions[-1]["correct"] = 1
questions[-1]["explanation"] = "40 managers all have MBAs. 100 employees total have MBAs. Since only 40 of the 100 MBA holders are managers, the remaining 60 MBA holders are NOT managers. So it must be true that some employees with MBAs are not managers.\n\nChoice B is correct."

# CR11 — Weaken
questions.append(cr("medium",
    "A study found that children who regularly play video games score higher on spatial reasoning tests than children who do not play video games. The researchers concluded that video games improve spatial reasoning skills.\n\nWhich of the following, if true, most seriously weakens the researchers' conclusion?",
    [
        "Spatial reasoning skills are useful in many academic subjects.",
        "Children with naturally strong spatial reasoning skills are more likely to enjoy and regularly play video games.",
        "The study included children from diverse socioeconomic backgrounds.",
        "Some video games require players to solve complex puzzles.",
        "Adults who play video games also tend to score higher on spatial reasoning tests."
    ],
    1,
    "Choice B suggests reverse causation: rather than games improving spatial skills, children with better spatial skills are drawn to games. This alternative explanation undermines the causal conclusion."
))

# CR12 — Strengthen
questions.append(cr("easy",
    "A city installed speed cameras on a stretch of highway known for frequent accidents. In the year after installation, accidents on that stretch decreased by 40 percent.\n\nWhich of the following, if true, most supports the conclusion that the speed cameras were responsible for the decrease?",
    [
        "The city also installed new streetlights along the highway during the same period.",
        "Similar stretches of highway without speed cameras saw no significant change in accident rates during the same period.",
        "The speed cameras were manufactured by a well-known technology company.",
        "Some drivers have complained that the speed cameras are too sensitive.",
        "The highway was resurfaced two years before the cameras were installed."
    ],
    1,
    "Choice B serves as a control comparison. If similar roads without cameras showed no change, it supports the conclusion that the cameras (not some external factor) caused the decrease."
))

# CR13 — Assumption
questions.append(cr("medium",
    "The CEO of a retail chain argues that closing underperforming stores will increase the company's overall profitability because those stores currently generate losses.\n\nWhich of the following is an assumption on which the CEO's argument depends?",
    [
        "The underperforming stores are located in areas with declining populations.",
        "The company will not lose a significant amount of revenue from customers who currently shop at both underperforming and profitable stores.",
        "The company has more underperforming stores than profitable stores.",
        "The employees of the closed stores will be transferred to profitable stores.",
        "The lease agreements for the underperforming stores can be terminated without penalty."
    ],
    1,
    "If customers of closing stores also shop at other stores in the chain, closing those stores might drive those customers away entirely, reducing revenue at the remaining stores. The CEO assumes this cross-shopping effect won't significantly impact overall profitability."
))

# CR14 — Evaluate
questions.append(cr("medium",
    "A nutritionist recommends that athletes replace sports drinks with coconut water, arguing that coconut water provides the same electrolyte replenishment with fewer artificial ingredients.\n\nWhich of the following would it be most useful to know in evaluating the nutritionist's recommendation?",
    [
        "Whether coconut water tastes better than sports drinks.",
        "Whether the electrolyte concentration in coconut water is sufficient for high-intensity athletic performance.",
        "Whether coconut water is available in the same retail locations as sports drinks.",
        "Whether the nutritionist has any financial interest in coconut water brands.",
        "Whether athletes currently consume sports drinks before or after exercise."
    ],
    1,
    "The recommendation depends on coconut water providing 'the same electrolyte replenishment.' To evaluate this, we need to know whether coconut water actually delivers sufficient electrolytes for athletic performance, which is what Choice B addresses."
))

# CR15 — Boldface
questions.append(cr("hard",
    "Some economists argue that raising the minimum wage will lead to job losses because employers will reduce their workforce to offset higher labor costs. **However, recent studies of cities that raised their minimum wages found no significant reduction in employment.** These economists respond that the studies cover too short a time period. **But even studies tracking employment over five years have found similar results.**\n\nIn the argument above, the two boldface portions play which of the following roles?",
    [
        "The first supports the economists' position; the second undermines it.",
        "The first presents evidence against a prediction; the second reinforces that evidence.",
        "The first is a conclusion; the second is a premise supporting that conclusion.",
        "The first provides a counterexample; the second addresses an objection to that counterexample.",
        "Both present evidence that supports the economists' original argument."
    ],
    3,
    "The first boldface presents evidence against the economists' prediction (no job losses found). The second boldface responds to the economists' objection about time period by showing that even longer studies found the same results. So: first = counterexample, second = addresses objection to that counterexample."
))

# CR16 — Weaken
questions.append(cr("easy",
    "A car manufacturer claims that its electric vehicles (EVs) produce zero emissions and are therefore better for the environment than gasoline cars.\n\nWhich of the following, if true, most weakens the manufacturer's claim?",
    [
        "Electric vehicles are more expensive to purchase than gasoline cars.",
        "The electricity used to charge EVs in most regions is generated primarily from coal-fired power plants.",
        "EVs require less maintenance than gasoline cars.",
        "Gasoline cars have become more fuel-efficient in recent years.",
        "The manufacturer also produces gasoline cars."
    ],
    1,
    "The claim focuses on zero emissions during driving. But if the electricity comes from coal plants, the total lifecycle emissions are substantial. Choice B undermines the 'better for the environment' claim by pointing out upstream emissions."
))

# CR17 — Inference
questions.append(cr("hard",
    "A recent survey of 500 employees at a large corporation found that 60 percent of employees who work from home report high job satisfaction, while only 45 percent of in-office employees report the same. However, the company allows only employees with at least 3 years of tenure to work from home.\n\nWhich of the following can be reasonably concluded from the information above?",
    [
        "Working from home causes higher job satisfaction.",
        "The difference in satisfaction rates may be partly explained by the greater experience of remote workers.",
        "The company should allow all employees to work from home.",
        "In-office employees are less productive than remote employees.",
        "Most employees at the company prefer working from home."
    ],
    1,
    "Since only tenured employees can work from home, the remote group has more experience. Higher satisfaction could stem from tenure/experience rather than remote work itself. Choice B correctly identifies this confounding variable as a possible partial explanation."
))

# CR18 — Strengthen
questions.append(cr("medium",
    "A museum director argues that extending evening hours on weekdays will attract visitors who work during the day, thereby increasing total attendance without cannibalizing weekend attendance.\n\nWhich of the following, if true, most supports the director's argument?",
    [
        "The museum's weekend attendance has been declining for the past three years.",
        "A nearby museum that extended its weekday hours saw a 20% increase in total attendance, with no change in weekend numbers.",
        "The museum has enough staff to cover additional evening hours.",
        "Most museum visitors are tourists who visit during the day on any day of the week.",
        "The museum's current weekday attendance is significantly lower than weekend attendance."
    ],
    1,
    "Choice B provides direct evidence from a comparable situation: a similar museum extended weekday hours and saw increased total attendance without affecting weekends. This directly supports the director's prediction."
))

# CR19 — Flaw
questions.append(cr("medium",
    "A newspaper editorial states: 'Since the number of public libraries in our city has decreased by 30 percent over the past decade, it is clear that residents are reading less than they did ten years ago.'\n\nWhich of the following identifies the most significant flaw in the editorial's reasoning?",
    [
        "The editorial does not specify which libraries closed.",
        "The editorial ignores the growing availability of e-books and digital reading platforms.",
        "The editorial does not compare reading rates with those of other cities.",
        "Some public libraries have expanded their non-book services.",
        "The number of bookstores in the city has also declined."
    ],
    1,
    "The editorial assumes fewer libraries means less reading. But if digital reading has grown (e-books, online libraries, audiobooks), people may be reading the same amount or more through different media. Choice B identifies this overlooked alternative."
))

# CR20 — Assumption
questions.append(cr("hard",
    "A company plans to improve employee health by subsidizing gym memberships. The CEO predicts that this will reduce the company's health insurance costs because healthier employees will file fewer medical claims.\n\nThe CEO's prediction relies on which of the following assumptions?",
    [
        "Gym memberships are not already covered by the employees' health insurance.",
        "Employees who use subsidized gym memberships will exercise frequently enough to materially improve their health.",
        "The company's health insurance premiums are higher than the industry average.",
        "Most employees currently do not exercise regularly.",
        "The gym facilities are conveniently located near the company's offices."
    ],
    1,
    "Having a membership doesn't guarantee usage or health improvement. The CEO's prediction requires that employees actually use the gym enough to get healthier, which would then reduce claims. Choice B identifies this necessary link in the argument chain."
))

# ═══════════════════════════════════════════════════
# WRITE OUTPUT
# ═══════════════════════════════════════════════════

print(f"Total questions generated: {len(questions)}")

for q_item in questions:
    assert 0 <= q_item["correct"] < len(q_item["choices"]), \
        f"Invalid correct index {q_item['correct']} for {q_item['id']}"
    assert len(q_item["choices"]) == 5, f"Wrong number of choices for {q_item['id']}"

from collections import Counter
diffs = Counter(q_item["difficulty"] for q_item in questions)
print(f"Difficulty: {dict(diffs)}")

output_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data", "critical-reasoning", "criticalReasoning.json")
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(questions, f, indent=2, ensure_ascii=False)

print(f"\nWritten to {output_path}")
print(f"File size: {os.path.getsize(output_path) / 1024:.1f} KB")
