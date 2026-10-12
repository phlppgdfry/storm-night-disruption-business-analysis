# Executable acceptance examples for the recovery allocation rules.
# Run in CI by tests/allocation.test.mjs against site/assets/lib/allocate.mjs — the module the prototype and the simulation use.
# Every rule R-01 … R-16 has at least one tagged example; scripts/check-trace.mjs fails the build if one is missing.
# Lane metres: trailer 14, reefer 14, adr 14, accompanied 17.5, project 22. Times are in the storm week (Thu … Sun).

Feature: Recovery allocation after cancelled sailings
  As the duty manager on a storm night
  I want every stranded unit placed on a recovery sailing by one agreed set of rules
  So that customers get an answer within the hour and the rules can be explained to anyone who asks

  @SC-01 @R-01
  Scenario: A sailing whose booking cut-off has passed is skipped
    Given it is "Fri 07:00"
    And these recovery sailings:
      | sailing | departs   | lane metres |
      | TW-27   | Fri 08:00 | 100         |
      | TW-29   | Fri 12:00 | 100         |
    And these stranded units:
      | unit | type    |
      | U1   | trailer |
    When the recovery plan is built
    Then "U1" is planned on "TW-29"
    And the reasons for "U1" mention "booking closed"

  @SC-02 @R-02 @R-10
  Scenario: Lane metres are never exceeded; the queue decides who goes first
    Given it is "Thu 16:50"
    And these recovery sailings:
      | sailing | departs   | lane metres |
      | TW-27   | Fri 08:00 | 28          |
      | TW-29   | Fri 12:00 | 100         |
    And these stranded units:
      | unit | type    | booked    |
      | U1   | trailer | Mon 09:00 |
      | U2   | trailer | Tue 09:00 |
      | U3   | trailer | Wed 09:00 |
    When the recovery plan is built
    Then the plan is:
      | unit | sailing |
      | U1   | TW-27   |
      | U2   | TW-27   |
      | U3   | TW-29   |
    And no sailing is over its lane metres, plugs or ADR slots

  @SC-03 @R-03
  Scenario: A reefer only goes where there is a free plug
    Given it is "Thu 16:50"
    And these recovery sailings:
      | sailing | departs   | lane metres | plugs |
      | TW-27   | Fri 08:00 | 100         | 0     |
      | TW-29   | Fri 12:00 | 100         | 1     |
    And these stranded units:
      | unit | type   |
      | R1   | reefer |
    When the recovery plan is built
    Then "R1" is planned on "TW-29"
    And the reasons for "R1" mention "no reefer plug left"

  @SC-04 @R-04
  Scenario: Dangerous goods only go where there is a free ADR slot
    Given it is "Thu 16:50"
    And these recovery sailings:
      | sailing | departs   | lane metres | adr |
      | TW-27   | Fri 08:00 | 100         | 0   |
      | TW-29   | Fri 12:00 | 100         | 1   |
    And these stranded units:
      | unit | type |
      | D1   | adr  |
    When the recovery plan is built
    Then "D1" is planned on "TW-29"

  @SC-05 @R-05
  Scenario: Project cargo only goes on a vessel with a high deck
    Given it is "Thu 16:50"
    And these recovery sailings:
      | sailing | departs   | lane metres | high deck |
      | TW-27   | Fri 08:00 | 100         | no        |
      | TWX-1   | Fri 10:00 | 100         | yes       |
    And these stranded units:
      | unit | type    |
      | P1   | project |
    When the recovery plan is built
    Then "P1" is planned on "TWX-1"

  @SC-06 @R-06
  Scenario: A unit without a customs pre-lodgement is held and does not take space
    Given it is "Thu 16:50"
    And these recovery sailings:
      | sailing | departs   | lane metres |
      | TW-27   | Fri 08:00 | 14          |
      | TW-29   | Fri 12:00 | 100         |
    And these stranded units:
      | unit | type    | booked    | customs |
      | U1   | trailer | Mon 09:00 | missing |
      | U2   | trailer | Tue 09:00 | ok      |
    When the recovery plan is built
    Then "U1" is held for customs
    And "U2" is planned on "TW-27"

  @SC-07 @R-07
  Scenario: Perishables go by deadline, not by booking time
    Given it is "Thu 16:50"
    And these recovery sailings:
      | sailing | departs   | lane metres | plugs |
      | TW-27   | Fri 08:00 | 100         | 1     |
      | TW-29   | Fri 12:00 | 100         | 1     |
    And these stranded units:
      | unit | type       | booked    | deadline  |
      | F1   | perishable | Mon 09:00 | Fri 20:00 |
      | F2   | perishable | Wed 09:00 | Fri 11:00 |
    When the recovery plan is built
    Then the plan is:
      | unit | sailing |
      | F2   | TW-27   |
      | F1   | TW-29   |

  @SC-08 @R-07
  Scenario: A perishable goes before an ordinary trailer that was booked earlier
    Given it is "Thu 16:50"
    And these recovery sailings:
      | sailing | departs   | lane metres | plugs |
      | TW-27   | Fri 08:00 | 14          | 2     |
      | TW-29   | Fri 12:00 | 100         | 2     |
    And these stranded units:
      | unit | type       | booked    | deadline  |
      | U1   | trailer    | Mon 09:00 |           |
      | F1   | perishable | Wed 09:00 | Fri 14:00 |
    When the recovery plan is built
    Then the plan is:
      | unit | sailing |
      | F1   | TW-27   |
      | U1   | TW-29   |

  @SC-09 @R-08
  Scenario: A waiting driver goes before an unaccompanied trailer
    Given it is "Thu 16:50"
    And these recovery sailings:
      | sailing | departs   | lane metres |
      | TW-27   | Fri 08:00 | 20          |
      | TW-29   | Fri 12:00 | 100         |
    And these stranded units:
      | unit | type        | booked    |
      | U1   | trailer     | Mon 09:00 |
      | A1   | accompanied | Wed 09:00 |
    When the recovery plan is built
    Then the plan is:
      | unit | sailing |
      | A1   | TW-27   |
      | U1   | TW-29   |

  @SC-10 @R-08
  Scenario: Drivers go in order of arrival at the terminal
    Given it is "Thu 18:00"
    And these recovery sailings:
      | sailing | departs   | lane metres |
      | TW-27   | Fri 08:00 | 20          |
      | TW-29   | Fri 12:00 | 100         |
    And these stranded units:
      | unit | type        | booked    | at terminal |
      | A1   | accompanied | Mon 09:00 | Thu 17:40   |
      | A2   | accompanied | Wed 09:00 | Thu 15:10   |
    When the recovery plan is built
    Then the plan is:
      | unit | sailing |
      | A2   | TW-27   |
      | A1   | TW-29   |

  @SC-11 @R-09
  Scenario: Contract customers have first claim on their allotment share of each sailing
    Given it is "Thu 16:50"
    And the contract allotment share is 50%
    And these recovery sailings:
      | sailing | departs   | lane metres |
      | TW-27   | Fri 08:00 | 56          |
      | TW-29   | Fri 12:00 | 100         |
    And these stranded units:
      | unit | type    | contract | booked    |
      | N1   | trailer | no       | Mon 09:00 |
      | N2   | trailer | no       | Mon 10:00 |
      | N3   | trailer | no       | Mon 11:00 |
      | N4   | trailer | no       | Mon 12:00 |
      | K1   | trailer | yes      | Wed 09:00 |
      | K2   | trailer | yes      | Wed 10:00 |
    When the recovery plan is built
    Then the plan is:
      | unit | sailing |
      | K1   | TW-27   |
      | K2   | TW-27   |
      | N1   | TW-27   |
      | N2   | TW-27   |
      | N3   | TW-29   |
      | N4   | TW-29   |

  @SC-12 @R-09
  Scenario: The allotment share is a first claim, not space kept empty
    Given it is "Thu 16:50"
    And the contract allotment share is 50%
    And these recovery sailings:
      | sailing | departs   | lane metres |
      | TW-27   | Fri 08:00 | 56          |
    And these stranded units:
      | unit | type    | contract | booked    |
      | N1   | trailer | no       | Mon 09:00 |
      | N2   | trailer | no       | Mon 10:00 |
      | N3   | trailer | no       | Mon 11:00 |
      | N4   | trailer | no       | Mon 12:00 |
    When the recovery plan is built
    Then the plan is:
      | unit | sailing |
      | N1   | TW-27   |
      | N2   | TW-27   |
      | N3   | TW-27   |
      | N4   | TW-27   |

  @SC-13 @R-10
  Scenario: Units of the earlier cancelled sailing go first, whatever their booking time
    Given it is "Thu 16:50"
    And these recovery sailings:
      | sailing | departs   | lane metres |
      | TW-27   | Fri 08:00 | 14          |
      | TW-29   | Fri 12:00 | 100         |
    And these stranded units:
      | unit | type    | original sailing | booked    |
      | U1   | trailer | TW-23            | Mon 09:00 |
      | U2   | trailer | TW-21            | Wed 09:00 |
    When the recovery plan is built
    Then the plan is:
      | unit | sailing |
      | U2   | TW-27   |
      | U1   | TW-29   |

  @SC-14 @R-11
  Scenario: A replan round never moves a confirmed unit to make room
    Given it is "Thu 17:50"
    And these recovery sailings:
      | sailing | departs   | lane metres | plugs |
      | TW-27   | Fri 08:00 | 14          | 1     |
      | TW-29   | Fri 12:00 | 100         | 1     |
    And "U1", a trailer, is already confirmed on "TW-27"
    And these stranded units:
      | unit | type       | deadline  |
      | F1   | perishable | Fri 11:00 |
    When the recovery plan is built
    Then the plan is:
      | unit | sailing |
      | U1   | TW-27   |
      | F1   | TW-29   |
    And "F1" is escalated

  @SC-15 @R-12
  Scenario: The duty manager overrides a unit with a reason code
    Given it is "Thu 16:50"
    And these recovery sailings:
      | sailing | departs   | lane metres |
      | TW-27   | Fri 08:00 | 14          |
      | TW-29   | Fri 12:00 | 100         |
    And these stranded units:
      | unit | type    | booked    |
      | U1   | trailer | Mon 09:00 |
      | U2   | trailer | Wed 09:00 |
    And the duty manager overrides "U2" to "TW-27" with reason "OV-2"
    When the recovery plan is built
    Then the plan is:
      | unit | sailing |
      | U2   | TW-27   |
      | U1   | TW-29   |
    And the reasons for "U2" mention "OV-2"

  @SC-16 @R-12 @R-03
  Scenario: An override cannot break a hard constraint
    Given it is "Thu 16:50"
    And these recovery sailings:
      | sailing | departs   | lane metres | plugs |
      | TW-27   | Fri 08:00 | 100         | 0     |
      | TW-29   | Fri 12:00 | 100         | 1     |
    And these stranded units:
      | unit | type   |
      | R1   | reefer |
    And the duty manager overrides "R1" to "TW-27" with reason "OV-1"
    When the recovery plan is built
    Then "R1" is planned on "TW-29"
    And the reasons for "R1" mention "refused"

  @SC-17 @R-13
  Scenario: A unit is only planned on a sailing it can reach
    Given it is "Thu 16:50"
    And these recovery sailings:
      | sailing | departs   | lane metres |
      | TW-27   | Fri 08:00 | 100         |
      | TWX-1   | Fri 10:00 | 100         |
      | TW-29   | Fri 12:00 | 100         |
    And these stranded units:
      | unit | type    | at terminal |
      | U1   | trailer | Fri 09:30   |
    When the recovery plan is built
    Then "U1" is planned on "TW-29"
    And the reasons for "U1" mention "cannot be at the terminal"

  @SC-18 @R-14
  Scenario: A perishable that cannot make its deadline is planned early and escalated
    Given it is "Thu 16:50"
    And these recovery sailings:
      | sailing | departs   | lane metres | plugs |
      | TW-27   | Fri 08:00 | 100         | 1     |
    And these stranded units:
      | unit | type       | deadline  |
      | F1   | perishable | Fri 06:00 |
    When the recovery plan is built
    Then "F1" is planned on "TW-27"
    And "F1" is escalated

  @SC-19 @R-15
  Scenario: Scarce slots first — the ADR unit gets the only ADR slot
    Given it is "Thu 16:50"
    And these recovery sailings:
      | sailing | departs   | lane metres | adr |
      | TW-27   | Fri 08:00 | 28          | 1   |
      | TW-29   | Fri 12:00 | 28          | 0   |
    And these stranded units:
      | unit | type        | booked    |
      | A1   | accompanied | Mon 09:00 |
      | U1   | trailer     | Tue 09:00 |
      | D1   | adr         | Wed 09:00 |
    When the recovery plan is built
    Then the plan is:
      | unit | sailing |
      | D1   | TW-27   |
      | U1   | TW-27   |
      | A1   | TW-29   |

  @SC-20 @R-15 @policy
  Scenario: Without R-15 (Operations' proposal) the same ADR unit finds no sailing
    Given it is "Thu 16:50"
    And the policy is "perishablesFirst"
    And these recovery sailings:
      | sailing | departs   | lane metres | adr |
      | TW-27   | Fri 08:00 | 28          | 1   |
      | TW-29   | Fri 12:00 | 28          | 0   |
    And these stranded units:
      | unit | type        | booked    |
      | A1   | accompanied | Mon 09:00 |
      | U1   | trailer     | Tue 09:00 |
      | D1   | adr         | Wed 09:00 |
    When the recovery plan is built
    Then the plan is:
      | unit | sailing |
      | A1   | TW-27   |
      | U1   | TW-29   |
      | D1   | NONE    |

  @SC-21 @policy
  Scenario: Sales' proposal puts every contract unit first
    Given it is "Thu 16:50"
    And the policy is "keyAccountsFirst"
    And these recovery sailings:
      | sailing | departs   | lane metres | plugs |
      | TW-27   | Fri 08:00 | 28          | 2     |
      | TW-29   | Fri 12:00 | 100         | 2     |
    And these stranded units:
      | unit | type       | contract | booked    | deadline  |
      | F1   | perishable | no       | Mon 09:00 | Fri 11:00 |
      | K1   | trailer    | yes      | Wed 09:00 |           |
      | K2   | trailer    | yes      | Wed 10:00 |           |
    When the recovery plan is built
    Then the plan is:
      | unit | sailing |
      | K1   | TW-27   |
      | K2   | TW-27   |
      | F1   | TW-29   |
    And "F1" is escalated

  @SC-22 @policy
  Scenario: Customer service's proposal is one queue in booking order
    Given it is "Thu 16:50"
    And the policy is "fifo"
    And these recovery sailings:
      | sailing | departs   | lane metres | plugs |
      | TW-27   | Fri 08:00 | 14          | 2     |
      | TW-29   | Fri 12:00 | 100         | 2     |
    And these stranded units:
      | unit | type       | booked    | deadline  |
      | U1   | trailer    | Mon 09:00 |           |
      | F1   | perishable | Wed 09:00 | Fri 11:00 |
    When the recovery plan is built
    Then the plan is:
      | unit | sailing |
      | U1   | TW-27   |
      | F1   | TW-29   |

  @SC-23 @R-16 @R-11
  Scenario: A smaller ship — confirmed units that no longer fit are re-planned and escalated
    # Storm drill finding F-5: TW-29's vessel is swapped and loses reefer plugs after units were confirmed.
    Given it is "Thu 17:50"
    And these recovery sailings:
      | sailing | departs   | lane metres | plugs |
      | TW-29   | Fri 12:00 | 100         | 1     |
      | TW-31   | Fri 16:00 | 100         | 2     |
    And "R1", a reefer, is already confirmed on "TW-29"
    And "R2", a reefer, is already confirmed on "TW-29"
    When the recovery plan is built
    Then the plan is:
      | unit | sailing |
      | R1   | TW-29   |
      | R2   | TW-31   |
    And "R2" is escalated
    And the reasons for "R2" mention "capacity change"
